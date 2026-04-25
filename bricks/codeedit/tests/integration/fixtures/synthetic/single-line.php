<?php

class Example
{
    public function hasAnyChange(): bool
    {
        return !empty($this->getChanges());
    }

    public function commit(): void
    {
        echo "ok";
    }
}
