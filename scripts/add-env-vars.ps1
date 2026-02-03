# Add Environment Variables to Vercel
Write-Host "Adding environment variables to Vercel..."

# Instructions
Write-Host "`n=== STEP 1: Add PRIVATE_KEY ==="
Write-Host "Copy the private key from private-key.pem file"
Write-Host "Then run: vercel env add PRIVATE_KEY production"
Write-Host ""

# Read and display private key
if (Test-Path "private-key.pem") {
    Write-Host "Private Key Content:"
    Write-Host "-------------------"
    Get-Content "private-key.pem" -Raw
    Write-Host "-------------------"
    Write-Host ""
}

Write-Host "=== STEP 2: Add DATABASE_URL ==="
Write-Host "DATABASE_URL value:"
Write-Host "postgresql://neondb_owner:npg_sg2ufBzTKy4X@ep-square-unit-aiehv441-pooler.c-4.us-east-1.aws.neon.tech/Changan_maroc_survey_janvier_db?sslmode=require"
Write-Host ""
Write-Host "Run: vercel env add DATABASE_URL production"
Write-Host ""

Write-Host "=== STEP 3: Add to Preview and Development ==="
Write-Host "Also add both variables to preview and development environments"
Write-Host "Run: vercel env add PRIVATE_KEY preview"
Write-Host "Run: vercel env add DATABASE_URL preview"
Write-Host "Run: vercel env add PRIVATE_KEY development"
Write-Host "Run: vercel env add DATABASE_URL development"
Write-Host ""

Write-Host "=== STEP 4: Redeploy ==="
Write-Host "After adding all environment variables, redeploy:"
Write-Host "Run: vercel --prod"
