# Icon Generation Instructions

このディレクトリには拡張機能のアイコンファイルが必要です。

## 必要なファイル
- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

## 生成方法

### Option 1: ImageMagick を使用
```bash
# SVGからPNGを生成
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png
```

### Option 2: オンラインツールを使用
1. https://cloudconvert.com/svg-to-png
2. icon.svg をアップロード
3. 各サイズ（16x16, 48x48, 128x128）でダウンロード

### Option 3: 手動で作成
お好きな画像編集ソフトで、以下のサイズのPNG画像を作成してください。
- 16x16ピクセル
- 48x48ピクセル
- 128x128ピクセル

## 注意事項
アイコンがない場合、Chrome拡張機能はデフォルトアイコンを使用します。
