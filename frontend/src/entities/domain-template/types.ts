/**
 * 分野テンプレート: AI 候補生成時に「分野ポリシー」として 1 ブロック分の自由文を
 * プロンプトに差し込むためのオブジェクト。
 *
 * かつては JSON の 7 フィールドを持っていたが、AI への効果が曖昧で入力負荷も
 * 高かったため、`domain_hint` 1 行 (= 旧 instruction_json.goal の後継) に
 * 集約した。残りのフィールドは system prompt 側の共通ルールでカバーしている。
 */
export interface DomainTemplate {
  id: number;
  name: string;
  description: string | null;
  /** AI に渡す分野ヒント (空または null ならブロックごとプロンプトから除外される)。 */
  domain_hint: string | null;
  created_at: string | null;
  updated_at: string | null;
}
