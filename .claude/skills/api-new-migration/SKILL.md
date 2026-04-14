---
name: api-new-migration
description: |
  **必ず使用する条件**: database/migrations/ に新しいマイグレーションファイルを作成するすべてのタスク。ユーザーが「users にカラム追加」「decks テーブル作って」「インデックス張って」等と指示した場合、この skill を必ず起動すること。
  やること: Laravel 11+ の匿名クラス形式で、命名規則 (snake_case, 複数形)・外部キー規約 (foreignId+constrained+cascadeOnDelete)・複合インデックス (user_id 先頭)・ソフトデリート・JSON/Enum カラム・down() メソッドを全て備えたマイグレーションを生成し、Model の $fillable / casts / リレーション、Factory までセットで更新する。
  使わない場合: 新リソース全体を作る場合は api-new-resource (マイグレーション含む)。既存マイグレーションの編集は skill 不要。
  必ず docs/02_er_diagram.md と docs/06_backend_design.md に従うこと。
---

# API New Migration Skill

マイグレーションを `docs/02_er_diagram.md` の規約に沿って作成する。

## 前提ドキュメント
- `docs/02_er_diagram.md` (ER図、カラム型、インデックス)
- `docs/06_backend_design.md` 11-3 (Mass Assignment)

## 引数
`<description>` — Laravel の `make:migration` に渡す文字列。

例:
- `create_decks_table` — 新規テーブル
- `add_suspended_flag_to_cards` — カラム追加
- `add_index_to_card_schedules` — インデックス追加

## 手順

### 1. コマンド実行
```bash
docker compose exec backend php artisan make:migration <description>
```

### 2. 新規テーブルの場合

#### 必須要素
```php
Schema::create('decks', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();

    // ドメイン固有のカラム
    $table->string('name');
    $table->text('description')->nullable();
    $table->foreignId('default_domain_template_id')
        ->nullable()
        ->constrained('domain_templates')
        ->nullOnDelete();
    $table->unsignedInteger('new_cards_limit')->default(20);
    $table->unsignedInteger('review_limit')->nullable();

    $table->timestamps();

    // インデックス: マルチテナント + ソートキーの複合
    $table->index(['user_id', 'updated_at']);
});
```

#### チェックポイント
- [ ] `$table->foreignId('user_id')->constrained()->cascadeOnDelete();` (マルチテナント必須)
- [ ] 他テーブルへの FK は `constrained('<table>')->nullOnDelete()` or `->cascadeOnDelete()` を明示
- [ ] 検索・ソートに使うカラムに **複合インデックス** (user_id を先頭)
- [ ] タイムスタンプ (`$table->timestamps();`)
- [ ] ENUM 相当は **string + PHP Enum キャスト** で表現 (`$table->string('card_type');`)
- [ ] JSON カラムは `$table->json('instruction_json');`
- [ ] Soft Delete が必要なテーブルには `$table->softDeletes();`

### 3. カラム追加の場合
```php
public function up(): void
{
    Schema::table('cards', function (Blueprint $table) {
        $table->boolean('is_suspended')->default(false)->after('card_type');
    });
}

public function down(): void
{
    Schema::table('cards', function (Blueprint $table) {
        $table->dropColumn('is_suspended');
    });
}
```

- `->after('既存カラム')` で配置を明示
- `down()` を必ず実装 (ロールバック可能に)

### 4. インデックス追加
```php
Schema::table('card_schedules', function (Blueprint $table) {
    $table->index(['user_id', 'due_at'], 'idx_schedules_user_due');
});
```

- インデックス名を明示 (自動生成名は衝突しやすい)

### 5. データ移行を伴う場合
データ変更が必要なら、新しいマイグレーションを **分割** する:
1. スキーマ変更
2. データバックフィル (Seeder or Eloquent)
3. 制約追加 (NOT NULL 等)

### 6. Model への反映
- 新カラムを `$fillable` に追加
- 型を `casts()` に追加 (JSON, Enum, Carbon 等)
- 必要ならリレーションメソッドを追加

### 7. Factory への反映
`DeckFactory::definition()` に新カラムのデフォルト値を追加。

### 8. マイグレーション実行 + 確認
```bash
docker compose exec backend php artisan migrate
docker compose exec backend php artisan migrate:rollback   # down が動くか確認
docker compose exec backend php artisan migrate
```

### 9. テスト
既存テストが壊れていないか:
```bash
docker compose exec backend php artisan test
```

## 規約まとめ

### テーブル名
- **snake_case 複数形** (`decks`, `note_seeds`, `ai_card_candidates`)
- 中間テーブルは **単数形を辞書順アンダースコア** (`card_tag`)

### カラム名
- **snake_case**
- Boolean は `is_*` / `has_*`
- 日時は `*_at` (`created_at`, `last_reviewed_at`, `due_at`)
- FK は `<参照テーブル単数>_id` (`user_id`, `deck_id`)
- JSON は `*_json` (`instruction_json`, `schedule_snapshot_json`)

### インデックス戦略
- **全テーブルの主要クエリパターンで user_id を先頭**
- 外部キーには **自動でインデックスが張られないので注意** (Laravel の `foreignId()` は FK 制約は張るがカラムインデックスは張らない)
- 頻繁な絞り込み/ソートには **複合インデックス**

### 禁止事項
- 本番データに対して破壊的マイグレーションを unguard で実行
- `down()` を空のままにする
- FK 参照を `cascadeOnDelete` / `nullOnDelete` / `restrictOnDelete` のいずれも指定しない
- テーブル名をキャメルケースで作る

## トラブルシュート
- FK 制約エラー: 既存データが新制約を満たしていない → 先に移行 Seeder を走らせる
- インデックス名衝突: `->index(['a', 'b'], 'idx_custom_name')` で明示
- Laravel 11+: マイグレーションは `use Illuminate\Database\Migrations\Migration;` + 匿名クラス `return new class extends Migration {...};`
