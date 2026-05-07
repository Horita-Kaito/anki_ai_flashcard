<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Contracts\Services\UserCreationServiceInterface;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

final class CreateUserCommand extends Command
{
    protected $signature = 'app:create-user
                            {name : ユーザー名}
                            {email : メールアドレス}';

    protected $description = '新規ユーザーを作成する (新規登録フローは廃止されているため、管理者はこのコマンドを使う)';

    public function handle(UserCreationServiceInterface $userCreation): int
    {
        $name = (string) $this->argument('name');
        $email = (string) $this->argument('email');

        $password = $this->secret('パスワード (8文字以上)');
        $passwordConfirmation = $this->secret('パスワード (確認)');

        $validator = Validator::make([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'password_confirmation' => $passwordConfirmation,
        ], [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', 'string', 'min:8'],
        ]);

        if ($validator->fails()) {
            $this->error('入力に誤りがあります:');
            foreach ($validator->errors()->all() as $message) {
                $this->line('  - '.$message);
            }

            return self::FAILURE;
        }

        $user = $userCreation->create($name, $email, (string) $password);

        $this->info("ユーザーを作成しました (id={$user->id}, email={$user->email})");

        return self::SUCCESS;
    }
}
