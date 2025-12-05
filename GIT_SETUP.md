# Git ve GitHub Kurulum Rehberi

## Adım 1: Git Kurulumu

1. Git'i indirin: https://git-scm.com/download/win
2. Kurulum sırasında "Git from the command line and also from 3rd-party software" seçeneğini seçin
3. Kurulumu tamamlayın

## Adım 2: Git Yapılandırması

Terminal'de şu komutları çalıştırın:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Adım 3: Projeyi Git Repository'ye Çevirme

Proje klasöründe:

```bash
cd C:\Users\PC\Desktop\motion-app
git init
git add .
git commit -m "Version 1.0.0 - İlk stabil versiyon"
```

## Adım 4: GitHub'da Repository Oluşturma

1. GitHub'a gidin: https://github.com
2. Yeni repository oluşturun (New Repository)
3. Repository adını girin (örn: `motion-app`)
4. "Initialize this repository with a README" seçeneğini **işaretlemeyin**
5. "Create repository" butonuna tıklayın

## Adım 5: GitHub'a Bağlama

GitHub'da oluşturduğunuz repository'nin sayfasında "Quick setup" bölümünden URL'yi kopyalayın, sonra:

```bash
git remote add origin https://github.com/KULLANICI_ADI/motion-app.git
git branch -M main
git push -u origin main
```

## Adım 6: Versiyon 1'i Tag Olarak İşaretleme

```bash
git tag -a v1.0.0 -m "Version 1.0.0 - İlk stabil versiyon"
git push origin v1.0.0
```

## Versiyon 1'e Geri Dönme

İleride versiyon 1'e geri dönmek için:

```bash
git checkout v1.0.0
```

veya belirli bir commit'e dönmek için:

```bash
git log  # Commit geçmişini görüntüle
git checkout COMMIT_HASH  # Belirli commit'e dön
```

## Yeni Değişiklikler Yaparken

```bash
git add .
git commit -m "Değişiklik açıklaması"
git push
```

## Branch Kullanımı (Önerilen)

Yeni özellikler için branch oluşturun:

```bash
git checkout -b feature/yeni-ozellik
# Değişikliklerinizi yapın
git add .
git commit -m "Yeni özellik eklendi"
git push origin feature/yeni-ozellik
```

Ana branch'e geri dönmek için:

```bash
git checkout main
```


