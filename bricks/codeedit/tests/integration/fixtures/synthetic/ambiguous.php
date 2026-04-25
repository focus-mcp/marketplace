<?php
// Fixture: the word "hasAnyChange" appears in three locations —
// one method definition, one method call, one comment. Inserting
// "after hasAnyChange()" is ambiguous and must either disambiguate
// or refuse.

class Example
{
    public function hasAnyChange(): bool
    {
        return true;
    }

    public function apply(): void
    {
        if ($this->hasAnyChange()) {
            $this->commit();
        }
    }

    // called after hasAnyChange() is evaluated
    public function commit(): void
    {
        // ...
    }
}
