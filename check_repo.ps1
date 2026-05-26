# check_repo.ps1
$root = "C:\Users\bieri\Documents\GitHub\spia-murp-advisor"
$pass = 0; $fail = 0

function Check($file, $pattern, $label, $shouldExist = $true) {
    $path = Join-Path $root $file
    if (-not (Test-Path $path)) {
        Write-Host "  [MISSING FILE] $file" -ForegroundColor Red
        $script:fail++; return
    }
    $content = Get-Content $path -Raw -Encoding UTF8
    $found = $content -match [regex]::Escape($pattern)
    $ok = if ($shouldExist) { $found } else { -not $found }
    if ($ok) {
        Write-Host "  [OK] $label" -ForegroundColor Green
        $script:pass++
    } else {
        $status = if ($shouldExist) { "MISSING" } else { "SHOULD BE REMOVED" }
        Write-Host "  [!!] $label  ($status)" -ForegroundColor Red
        $script:fail++
    }
}

Write-Host "`n=== Message.tsx ===" -ForegroundColor Cyan
Check "src\components\Message.tsx" "import ReactMarkdown from"       "ReactMarkdown import"
Check "src\components\Message.tsx" "import remarkGfm from"           "remark-gfm import"
Check "src\components\Message.tsx" "remarkPlugins={[remarkGfm]}"     "remarkPlugins prop"
Check "src\components\Message.tsx" "Mark this answer as helpful"     "thumbs-up aria-label"
Check "src\components\Message.tsx" "Report this answer as unhelpful" "thumbs-down aria-label"
Check "src\components\Message.tsx" "Copy message to clipboard"       "copy aria-label"
Check "src\components\Message.tsx" "formatSource"                    "source formatter"
Check "src\components\Message.tsx" "clientOnly"                      "clientOnly in MessageData"

Write-Host "`n=== ChatWindow.tsx ===" -ForegroundColor Cyan
Check "src\components\ChatWindow.tsx" "Asking about"                        "header label"
Check "src\components\ChatWindow.tsx" "MURP Program"                        "scopeLabel program"
Check "src\components\ChatWindow.tsx" "Contacts & Admin"                    "scopeLabel admin"
Check "src\components\ChatWindow.tsx" "showCampusNudge"                     "campus nudge"
Check "src\components\ChatWindow.tsx" "showElectivesNudge"                  "electives nudge"
Check "src\components\ChatWindow.tsx" "showAdminNudge"                      "admin nudge"
Check "src\components\ChatWindow.tsx" "showLongConvoNudge"                  "long convo nudge"
Check "src\components\ChatWindow.tsx" "about core courses"                  "campus nudge text"
Check "src\components\ChatWindow.tsx" "some electives are campus-specific"  "electives nudge text"
Check "src\components\ChatWindow.tsx" "Banner"                              "admin nudge text"
Check "src\components\ChatWindow.tsx" "fresh conversation"                  "long convo nudge text"
Check "src\components\ChatWindow.tsx" "longConvoDismissed"                  "dismiss state"
Check "src\components\ChatWindow.tsx" "messages.length === 1 && !isLoading" "chips above map"
Check "src\components\ChatWindow.tsx" "i === 0 && messages.length === 1"    "chips inside Fragment REMOVED" $false

Write-Host "`n=== StarterPrompts.tsx ===" -ForegroundColor Cyan
Check "src\components\StarterPrompts.tsx" "Course sequence"         "chip: Course sequence"
Check "src\components\StarterPrompts.tsx" "Certificate options"     "chip: Certificate options"
Check "src\components\StarterPrompts.tsx" "Dual degree options"     "chip: Dual degree options"
Check "src\components\StarterPrompts.tsx" "Arlington vs Blacksburg" "chip: Arlington vs Blacksburg"
Check "src\components\StarterPrompts.tsx" "UAP 5174 policy"         "chip UAP 5174 REMOVED" $false

Write-Host "`n=== Sidebar.tsx ===" -ForegroundColor Cyan
Check "src\components\Sidebar.tsx" "certificates"              "certificates topic"
Check "src\components\Sidebar.tsx" "two-year course sequence"  "updated quick question"
Check "src\components\Sidebar.tsx" "final project"             "updated quick question 2"

Write-Host "`n=== page.tsx ===" -ForegroundColor Cyan
Check "src\app\page.tsx" "applyCampusPrefix" "campus prefix"
Check "src\app\page.tsx" "OPENING_MESSAGE"   "opening message"
Check "src\app\page.tsx" "setTopic"          "topic state"
Check "src\app\page.tsx" "sources"           "sources handled"
Check "src\app\page.tsx" "clientOnly"        "clientOnly filter"
Check "src\app\page.tsx" "h-dvh"             "mobile viewport fix"
Check "src\app\page.tsx" "h-screen"          "h-screen REMOVED" $false

Write-Host "`n=== route.ts ===" -ForegroundColor Cyan
Check "src\app\api\chat\route.ts" "AbortController" "abort controller"
Check "src\app\api\chat\route.ts" "AbortError"      "abort error"
Check "src\app\api\chat\route.ts" "maxDuration"     "max duration"
Check "src\app\api\chat\route.ts" "topic"           "topic param"
Check "src\app\api\chat\route.ts" "slice(-10)"      "history limit"

Write-Host "`n=== knowledge.ts ===" -ForegroundColor Cyan
Check "src\lib\knowledge.ts" "readdir"          "dynamic readdir"
Check "src\lib\knowledge.ts" "COURSE_NUMBER_RE" "course number regex"
Check "src\lib\knowledge.ts" "coursePrefix"     "course-specific loading"
Check "src\lib\knowledge.ts" "cachedFileList"   "file list cache"
Check "src\lib\knowledge.ts" "readFileCached"   "cached reads"
Check "src\lib\knowledge.ts" "void query"       "void query REMOVED" $false

Write-Host "`n=== systemPrompt.ts ===" -ForegroundColor Cyan
Check "src\lib\systemPrompt.ts" "Jane Jacobs"                   "Jacobs persona"
Check "src\lib\systemPrompt.ts" "Robert Moses"                  "Moses reference"
Check "src\lib\systemPrompt.ts" "tschenk@vt.edu"                "escalation Todd"
Check "src\lib\systemPrompt.ts" "bieri@vt.edu"                  "escalation Bieri"
Check "src\lib\systemPrompt.ts" "Never invent"                  "anti-hallucination"
Check "src\lib\systemPrompt.ts" "markdown formatting naturally" "markdown updated"
Check "src\lib\systemPrompt.ts" "Never use markdown pipe tables" "old table ban REMOVED" $false

Write-Host "`n=== opening-message.ts ===" -ForegroundColor Cyan
Check "src\lib\opening-message.ts" "I'm Jane"                        "Jane greeting"
Check "src\lib\opening-message.ts" "where the handbook is definitive" "updated text"
Check "src\lib\opening-message.ts" "maximum flexibility"              "flexibility line"
Check "src\lib\opening-message.ts" "clientOnly: true"                 "clientOnly flag"

Write-Host "`n=== package.json ===" -ForegroundColor Cyan
Check "package.json" "react-markdown"   "react-markdown dep"
Check "package.json" "remark-gfm"       "remark-gfm present"
Check "package.json" "@playwright/test" "playwright dev dep"
Check "package.json" "^4.0.0"           "remark-gfm v4 REMOVED" $false

Write-Host "`n=== test\jane.spec.ts ===" -ForegroundColor Cyan
Check "test\jane.spec.ts" "mockApi"                 "mock helper"
Check "test\jane.spec.ts" "beforeCount"             "count-based sendMessage"
Check "test\jane.spec.ts" "Arlington vs Blacksburg" "new chip label"
Check "test\jane.spec.ts" "Dual degree options"     "new chip label 2"
Check "test\jane.spec.ts" "UAP 5174 policy"         "old chip REMOVED" $false
Check "test\jane.spec.ts" "test.skip"               "test.skip REMOVED" $false

Write-Host "`n=== playwright.config.js ===" -ForegroundColor Cyan
Check "playwright.config.js" "testDir"  "config present"
Check "playwright.config.js" "BASE_URL" "base url env var"

Write-Host "`n=== test count (jane.spec.ts) ===" -ForegroundColor Cyan
$specPath      = Join-Path $root "test\jane.spec.ts"
$expectedTests = 37
if (-not (Test-Path $specPath)) {
    Write-Host "  [MISSING FILE] test\jane.spec.ts" -ForegroundColor Red
    $fail++
} else {
    $specRaw   = Get-Content $specPath -Raw -Encoding UTF8
    $testCount = ([regex]::Matches($specRaw, '(?m)^[ \t]*test\(')).Count
    if ($testCount -eq $expectedTests) {
        Write-Host "  [OK] jane.spec.ts test count = $expectedTests" -ForegroundColor Green
        $pass++
    } else {
        Write-Host "  [!!] jane.spec.ts test count = $testCount (expected $expectedTests)" -ForegroundColor Red
        $fail++
    }
}

Write-Host "`n========================================"
Write-Host "PASSED: $pass  FAILED: $fail" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
