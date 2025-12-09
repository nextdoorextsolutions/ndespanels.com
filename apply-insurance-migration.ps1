# PowerShell script to apply insurance fields migration
# Run this with: .\apply-insurance-migration.ps1

Write-Host "Insurance Fields Migration Script" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (Test-Path ".env") {
    Write-Host "✓ Found .env file" -ForegroundColor Green
} else {
    Write-Host "✗ .env file not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create a .env file with your database connection string:" -ForegroundColor Yellow
    Write-Host "DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Read migration file
$migrationPath = "drizzle/migrations/add_insurance_fields.sql"
if (Test-Path $migrationPath) {
    Write-Host "✓ Found migration file: $migrationPath" -ForegroundColor Green
    Write-Host ""
    
    # Display migration content
    Write-Host "Migration Content:" -ForegroundColor Cyan
    Write-Host "==================" -ForegroundColor Cyan
    Get-Content $migrationPath | Write-Host -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "To apply this migration:" -ForegroundColor Yellow
    Write-Host "1. Go to Supabase Dashboard → SQL Editor" -ForegroundColor White
    Write-Host "2. Copy the SQL above" -ForegroundColor White
    Write-Host "3. Paste and run it" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use psql if you have it installed:" -ForegroundColor Yellow
    Write-Host 'psql $env:DATABASE_URL -f drizzle/migrations/add_insurance_fields.sql' -ForegroundColor Gray
    
} else {
    Write-Host "✗ Migration file not found: $migrationPath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
