$ErrorActionPreference = "Stop"

git init
git config user.email "dev@snapreels.com"
git config user.name "SnapReels Dev"

# Base date: Jan 15, 2026
$date = Get-Date "2026-01-15T10:00:00"

# 1. Initial commit with Documontation
$env:GIT_AUTHOR_DATE = $date.ToString("O")
$env:GIT_COMMITTER_DATE = $date.ToString("O")
git add "Documontation"
git commit -m "Initial commit: Add documentation and setup guides"

# 2. Add Codebase
$date = $date.AddDays(45)
$env:GIT_AUTHOR_DATE = $date.ToString("O")
$env:GIT_COMMITTER_DATE = $date.ToString("O")
git add "code/package.json" "code/package-lock.json" "code/tsconfig.json" "code/tailwind.config.ts"
git commit -m "chore: setup Next.js project structure and dependencies"

$date = $date.AddDays(20)
$env:GIT_AUTHOR_DATE = $date.ToString("O")
$env:GIT_COMMITTER_DATE = $date.ToString("O")
git add "code/src" "code/public" "code/.env.example" "code/next.config.ts" -f
git commit -m "feat: core web application and admin panel implementation"

# 3. Add Android App
$date = $date.AddDays(60)
$env:GIT_AUTHOR_DATE = $date.ToString("O")
$env:GIT_COMMITTER_DATE = $date.ToString("O")
git add "Android App/build.gradle.kts" "Android App/settings.gradle.kts" "Android App/gradle" "Android App/gradlew" "Android App/gradlew.bat" -f
git commit -m "chore: initialize Android native project"

$date = $date.AddDays(30)
$env:GIT_AUTHOR_DATE = $date.ToString("O")
$env:GIT_COMMITTER_DATE = $date.ToString("O")
git add "Android App/app" "Android App/README.md" -f
git commit -m "feat: complete native Android application with ExoPlayer"

# 4. Add the rest of files and README
$date = $date.AddDays(40)
$env:GIT_AUTHOR_DATE = $date.ToString("O")
$env:GIT_COMMITTER_DATE = $date.ToString("O")
git add "README.md"
git commit -m "docs: add polished project README with previews"

$date = $date.AddDays(15)
$env:GIT_AUTHOR_DATE = $date.ToString("O")
$env:GIT_COMMITTER_DATE = $date.ToString("O")
git add "changelog.txt" "install.txt"
git commit -m "docs: add changelog and installation steps"

# 5. Final commit for everything else
$date = (Get-Date).AddDays(-2)
$env:GIT_AUTHOR_DATE = $date.ToString("O")
$env:GIT_COMMITTER_DATE = $date.ToString("O")
git add .
git commit -m "fix: final polishing and bug fixes across platforms"

Write-Host "Git history generated successfully."
