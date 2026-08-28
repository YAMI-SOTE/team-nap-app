// APIのレスポンスの型定義をまとめるファイル
export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
}
