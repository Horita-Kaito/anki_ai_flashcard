/**
 * User エンティティ型
 * 将来の課金プラン対応を見据え plan フィールドの余地を確保
 */
export interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  // 将来拡張: plan?: "free" | "pro";
}
