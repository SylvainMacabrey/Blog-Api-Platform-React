<?php

namespace App\Controller\Api;

use App\Entity\Comment;
use Symfony\Component\Security\Core\Security;

class CommentCreateController
{

    private $security;

    public function __construct(Security $security)
    {
        $this->security = $security;
    }

    public function __invoke(Comment $data)
    {
        $data->setAuthor($this->security->getUser());
        return $data;
    }   

}