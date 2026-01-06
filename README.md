# 入寮・出欠管理システム FluidMocha

手動入力を用いた、イベントの出欠確認および入寮受付ステータス管理システムです。
以前のFluidと異なり、マルチプラットフォームなWebアプリケーションです。

## セットアップ手順

### 1. データベースの構築 (SQL)
MySQLデータベースを用意し、以下のSQLファイルをインポートしてください。
これにはテーブル作成と初期ユーザーの登録が含まれます。

*   **ファイル**: `sql/schema.sql`
*   **方法**: phpMyAdminの「インポート」機能などを使用します。

### 2. 接続設定の更新
リポジトリにはセキュリティのためパスワードを含む設定ファイルは含まれていません。
サンプルファイルをコピーして、実環境用のファイルを作成します。

1.  `src/api/db.sample.php` をコピーして `src/api/db.php` にリネームします。
2.  `src/api/db.php` を開き、データベース接続情報を書き換えます。

```php
// src/api/db.php
private $host = 'mysql.example.com';   // ホスト名
private $db_name = 'my_database';      // データベース名
private $username = 'db_user';         // ユーザー名
private $password = 'db_password';     // パスワード
```

### 3. 依存ライブラリのインストール
ルートディレクトリで以下のコマンドを実行し、ライブラリ (`vendor` フォルダ) をインストールします。
（infinityfreeの場合は実行できないため、ローカルで生成する必要があります）

```bash
composer install
```

### 4. ファイルの配置 (デプロイ)
サーバーの公開ディレクトリ（`htdocs` や `public_html` など）に、**`src` フォルダの中身すべて**をアップロードします。
(`vendor` フォルダが生成されていることを確認してください)
サーバーの公開ディレクトリ（`htdocs` や `public_html` など）に、**`src` フォルダの中身すべて**をアップロードします。

**ディレクトリ構成例:**
```text
/htdocs
  ├── api/           (PHPバックエンド)
  ├── css/           (スタイルシート)
  ├── js/            (フロントエンドロジック)
  ├── vendor/        (ライブラリ: Composer依存関係)
  ├── uploads/       (名簿アップロード用フォルダ)
  ├── index.html     (ログイン画面: トップページ)
  ├── dashboard.html (管理者ダッシュボード)
  └── ...            (その他のHTMLファイル)
```

> [!IMPORTANT]
> `vendor` フォルダも必ずアップロードしてください。Excel読み込み機能などに必要です。

## 初期アカウント
構築直後は以下のユーザーでログイン可能です。セキュリティのため、ログイン後にパスワードを変更することを推奨します。

| ユーザー名 | 初期パスワード | 役割/リダイレクト先 |
|------------|----------------|---------------------|
| `admin`    | `password`     | 管理者ダッシュボード (`dashboard.html`) |
| `entrance` | `password`     | 入口・点呼 (`entrance.html`) |
| `floor`    | `password`     | 案内担当 (`floor.html`) ※要作成 |
| `reception`| `password`     | 共通受付 (`reception.html`) |
| `souhou`   | `password`     | 蒼鳳受付 (`reception-souhou.html`) |
| `tsubaki`  | `password`     | 椿受付 (`reception-tsubaki.html`) |

## 開発・カスタマイズ
*   **名簿データ**: 管理画面からExcelファイルをアップロードしてイベントごとの名簿を作成できます。
*   **認証**: 各ページは `js/auth.js` によって保護されており、未ログイン状態でのアクセスはログイン画面へリダイレクトされます。
