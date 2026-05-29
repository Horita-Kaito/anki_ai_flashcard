<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ChatMessageFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatMessage extends Model
{
    /** @use HasFactory<ChatMessageFactory> */
    use HasFactory;

    /** @var array<int, string> */
    protected $fillable = [
        'user_id',
        'chat_session_id',
        'role',
        'content',
        'metadata',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'metadata' => 'array',
    ];

    /** @return BelongsTo<User, self> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<ChatSession, self> */
    public function chatSession(): BelongsTo
    {
        return $this->belongsTo(ChatSession::class);
    }
}
