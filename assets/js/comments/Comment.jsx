import {render, unmountComponentAtNode} from 'react-dom'
import React, {useEffect, useRef, useCallback, useState} from 'react'
import {usePaginatedFetch, useFetch} from './hooks'

const dateFormat = {
    dateStyle: 'medium',
    timeStyle: 'short'
}
const VIEW = 'VIEW'
const EDIT = 'EDIT'

const className = (...arr) => arr.filter(Boolean).join(' ')

function Icon ({icon}) {
    return <i className={"fa fa-" + icon} aria-hidden='true'></i>
}

const Field = React.forwardRef(({name, help, children, error, onChange, required, minLength}, ref) => {
    if (error) {
        help = error
    }
    return <div className={className('form-group', error && 'has-error')}>
        <label className="control-label" htmlFor={ name }>{ children }</label>
        <textarea ref={ref} className="form-control" rows="10" name={ name } id={ name } onChange={onChange} required={required} minLength={minLength}/>
        {help && <div className="help-block">{ help }</div>}

    </div>
})

function Title ({count}) {
    return <h3><Icon icon="comments"/>{ count } commentaire{count > 1 ? 's' : ''}</h3>
}

const Comment = React.memo(({comment, onDelete, canEdit, onUpdate}) => {
    const date = new Date(comment.publishedAt)
    const toggleEdit = useCallback(() => { setState(state => state === VIEW ? EDIT : VIEW) }, [])
    const onDeleteCallback = useCallback(() => { onDelete(comment) }, [comment])
    const onComment = useCallback(
        (newComment) => { onUpdate(newComment, comment) 
        toggleEdit()
    }, [comment])
    const [state, setState] = useState(VIEW)
    const {loading: loadingDelete, load: callDelete} = useFetch(comment['@id'], 'DELETE', onDeleteCallback)
    return <div className="row post-comment">
        <a name="comment_{{ comment.id }}"></a>
        <h4 className="col-sm-3">
            <strong>{ comment.author.username }</strong>
            <strong>{ date.toLocaleString(undefined, dateFormat) }</strong>
        </h4>
        <div className="col-sm-9">
            { state === VIEW ?
             <p>{ comment.content }</p> :
             <CommentForm comment={ comment } onComment={ onComment } onCancel={ toggleEdit }/>
            }
            { (canEdit && state !== EDIT) && <p> 
                <button className="btn btn-danger" onClick={ callDelete.bind(this, null) } disabled={ loadingDelete }><Icon icon="trash"/> Supprimer </button>
                <button className="btn btn-secondary" onClick={ toggleEdit } ><Icon icon="pen"/> Editer </button>
            </p> }
        </div>
    </div>
})

const CommentForm = React.memo(({post = null, onComment, comment = null, onCancel = null}) => {
    const ref = useRef(null)
    const method = comment ? 'PUT' : 'POST'
    const url = comment ? comment['@id'] : '/api/comments'
    const onSuccess = useCallback(comment => {
        onComment(comment)
        ref.current.value = ''
    }, [ref, onComment])
    const onSubmit = useCallback(e => {
        e.preventDefault()
        load({
            content: ref.current.value,
            post: "/api/posts/" + post
        })
    }, [load, ref, post])
    useEffect(() => {
        if(comment && comment.content && ref.current) {
            ref.current.value = comment.content
        }
    }, [comment, ref])
    const {load, loading, errors, clearError} = useFetch(url, method, onSuccess)
    return <div className="well">
        <form onSubmit={ onSubmit }>
            { comment === null &&<fieldset>
                <legend><Icon icon="comment"/>Laisse un commentaire</legend>
            </fieldset> }
            <Field onChange={ clearError.bind(this, 'content') } ref={ ref } name="content" help="Les commentaires non comformes à notre code de conduite seront modérés." error={ errors['content'] } required minLength={5}>Votre commentaire</Field>
            <div className="form-group">
                <button className="btn btn-primary"><Icon icon="paper-plane" disabled={loading}/>{ comment === null ? 'Envoyer' : "Editer" }</button>
                { onCancel && <button className="btn btn-danger" onClick={ onCancel }>Annuler</button> }
            </div>
        </form>
    </div>
})

function Comments ({post, user}) {
    const {items: comments, setItems: setComments, hasMore, load, loading, count} = usePaginatedFetch('/api/comments?post=' + post)
    const addComment = useCallback(comment => { setComments(comments => [comment, ...comments]) }, [])
    const deleteComment = useCallback(comment => { setComments(comments => comments.filter(c => c !== comment)) }, [])
    const updateComment = useCallback((newComment, oldComment) => { setComments(comments => comments.map(c => c === oldComment ? newComment : c)) }, [])
    useEffect(() => { load() }, [])
    return <div>
        <Title count={count}/>
        {user && <CommentForm post={post} onComment={addComment}/>}
        {comments.map(comment => <Comment key={comment.id} comment={comment} canEdit={comment.author.id === user} onDelete={ deleteComment } onUpdate={ updateComment }/>)}
        {hasMore && <button desabled={loading} className="btn btn-primary" onClick={load}>Charger plus de commentaires</button>}
    </div>
}

class CommentsElement extends HTMLElement {

    constructor() {
        super()
        this.observer = null
    }

    connectedCallback () {
        const post = parseInt(this.dataset.post, 10)
        const user = parseInt(this.dataset.user, 10) || null
        if(this.observer === null) {
            this.observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if(entry.isIntersecting && entry.target === this) {
                        observer.disconnect()
                        render(<Comments post={post} user={user}/>, this)
                    }
                })
            })
        }
        this.observer.observe(this)
    }

    disconnectedCallback () {
        if(this.observer) this.observer.disconnect()
        unmountComponentAtNode(this)
    }

}

customElements.define('post-comments', CommentsElement)