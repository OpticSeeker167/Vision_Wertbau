# Publica exclusivamente en OpticSeeker167/Vision_Wertbau.
# No instala herramientas, no escribe tokens y no fuerza el historial.
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$targetRepository = 'OpticSeeker167/Vision_Wertbau'
$targetUrl = 'https://github.com/OpticSeeker167/Vision_Wertbau.git'
$remoteName = 'github'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\', '/')

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Falta $Name. Instala o configura esa herramienta antes de publicar. El script no instala software."
    }
}

function Run-Git([string[]]$Arguments) {
    & git @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Git no pudo completar: git $($Arguments -join ' ')" }
}

function Run-AuthenticatedGit([string[]]$Arguments) {
    # El helper de gh se usa solo en este comando, sin escribir configuracion
    # ni credenciales en el repositorio o en un archivo temporal.
    & git -c 'credential.https://github.com.helper=' -c 'credential.https://github.com.helper=!gh auth git-credential' @Arguments
    if ($LASTEXITCODE -ne 0) { throw "No se pudo completar la operacion Git con GitHub: $($Arguments -join ' ')" }
}

function Is-ExpectedRemote([string]$Value) {
    $candidate = $Value.Trim().TrimEnd('/')
    return $candidate -imatch '^(https://github\.com/OpticSeeker167/Vision_Wertbau(?:\.git)?|git@github\.com:OpticSeeker167/Vision_Wertbau(?:\.git)?)$'
}

Push-Location -LiteralPath $projectRoot
try {
    Require-Command 'git'
    Require-Command 'gh'
    Require-Command 'node'
    Require-Command 'npm.cmd'
    foreach ($requiredFile in @('package.json', 'dist/index.html', 'scripts/serve.mjs', 'tests/project.test.mjs')) {
        if (-not (Test-Path -LiteralPath (Join-Path $projectRoot $requiredFile) -PathType Leaf)) {
            throw "No se encontro $requiredFile. Ejecuta el script desde una copia completa de Vision Wertbau."
        }
    }
    $nodeVersion = & node --version
    if ($LASTEXITCODE -ne 0 -or "$nodeVersion" -notmatch '^v(\d+)\.') { throw 'No se pudo comprobar la version de Node.js.' }
    $nodeMajor = [int]$Matches[1]
    if ($nodeMajor -lt 20) { throw 'Se requiere Node.js 20 o posterior.' }

    & gh auth status --hostname github.com
    if ($LASTEXITCODE -ne 0) { throw 'GitHub CLI no tiene una sesion valida. Completa gh auth login y vuelve a ejecutar el script.' }
    $login = & gh api user --jq '.login'
    if ($LASTEXITCODE -ne 0 -or "$login".Trim() -cne 'OpticSeeker167') {
        throw 'La sesion activa de gh debe ser OpticSeeker167. No se modifico ningun repositorio de otra cuenta.'
    }

    Write-Host 'Verificando codigo y archivos del proyecto...'
    & npm.cmd run check
    if ($LASTEXITCODE -ne 0) { throw 'La comprobacion de sintaxis fallo. No se publicaron cambios.' }
    & npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw 'Las pruebas fallaron. No se publicaron cambios.' }

    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot '.git'))) {
        Run-Git -Arguments @('init', '--initial-branch=main')
    }
    $gitRoot = & git rev-parse --show-toplevel
    if ($LASTEXITCODE -ne 0 -or [IO.Path]::GetFullPath("$gitRoot").TrimEnd('\', '/') -ine $projectRoot) {
        throw 'La raiz Git no coincide con esta carpeta. No se publicara un repositorio padre ni un proyecto distinto.'
    }
    $branch = & git symbolic-ref --quiet --short HEAD
    if ($LASTEXITCODE -ne 0 -or "$branch".Trim() -cne 'main') {
        throw 'La rama local debe ser main. El script conserva las ramas existentes y no las renombra.'
    }
    & git var GIT_AUTHOR_IDENT | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Configura el nombre y correo de autor en Git antes de publicar.' }
    & git diff --cached --quiet
    if ($LASTEXITCODE -eq 1) { throw 'Hay cambios preparados previamente en Git. Revisalos y confirma su commit antes de ejecutar este script.' }
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo revisar el estado preparado de Git.' }

    $remotes = @(& git remote)
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron leer los remotos del proyecto.' }
    if ($remotes -contains $remoteName) {
        $existingRemote = @(& git remote get-url --all $remoteName)
        if ($LASTEXITCODE -ne 0 -or $existingRemote.Count -ne 1 -or -not (Is-ExpectedRemote "$($existingRemote[0])")) {
            throw "El remoto $remoteName ya existe y apunta a otro destino. Se conserva sin cambios."
        }
        $pushRemote = @(& git remote get-url --push --all $remoteName)
        if ($LASTEXITCODE -ne 0 -or $pushRemote.Count -ne 1 -or -not (Is-ExpectedRemote "$($pushRemote[0])")) {
            throw "La URL de publicacion del remoto $remoteName apunta a otro destino. Se conserva sin cambios."
        }
    }

    # Distinguir una ausencia real (404) de un error de red o autenticacion.
    try {
        $ErrorActionPreference = 'Continue'
        $metadata = & gh api "repos/$targetRepository" 2>$null
        $metadataExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = 'Stop' }
    $exists = $metadataExit -eq 0
    if ($exists) {
        $repository = ($metadata -join "`n") | ConvertFrom-Json
        if ($repository.full_name -cne $targetRepository -or -not $repository.private) {
            throw 'El repositorio existente no coincide con el destino privado esperado. Su configuracion se conserva.'
        }
        if ($repository.default_branch -and $repository.default_branch -cne 'main') {
            throw 'El repositorio existente usa otra rama principal. No se modifico su estructura.'
        }
    } else {
        try {
            $ErrorActionPreference = 'Continue'
            $httpDetails = & gh api --include "repos/$targetRepository" 2>&1
        } finally { $ErrorActionPreference = 'Stop' }
        if (($httpDetails -join "`n") -notmatch 'HTTP/\S+\s+404\b') {
            throw 'No se pudo comprobar si el repositorio existe. No se intento crear otro ni modificar remotos.'
        }
    }

    if ($exists) {
        # Leer la rama remota sin alterar ninguna rama local. Un historial
        # ajeno o divergente exige una revision manual; nunca se usa --force.
        $heads = & git -c 'credential.https://github.com.helper=' -c 'credential.https://github.com.helper=!gh auth git-credential' ls-remote --heads $targetUrl main
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo consultar la rama remota. No se publicaron cambios.' }
        if ($heads) {
            Run-AuthenticatedGit -Arguments @('fetch', '--no-tags', $targetUrl, 'refs/heads/main')
            & git merge-base --is-ancestor FETCH_HEAD HEAD
            if ($LASTEXITCODE -ne 0) { throw 'La rama remota contiene historial que falta localmente. El script se detiene sin combinar ni reemplazar commits.' }
        }
    }

    # Preparar exclusivamente los directorios y archivos de la aplicacion.
    $sourcePaths = @('README.md', 'THIRD_PARTY.md', 'INICIAR_VISION_WERTBAU.cmd', 'package.json', '.gitignore', 'dist', 'scripts', 'tests') |
        Where-Object { Test-Path -LiteralPath (Join-Path $projectRoot $_) }
    Run-Git -Arguments (@('add', '--all', '--') + $sourcePaths)
    & git diff --cached --quiet
    if ($LASTEXITCODE -eq 1) {
        Run-Git -Arguments @('commit', '-m', 'Update Vision Wertbau brand editor')
    } elseif ($LASTEXITCODE -ne 0) {
        throw 'No se pudo comprobar el contenido del commit.'
    }
    & git rev-parse --verify HEAD | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'No hay un commit local que publicar.' }

    if (-not $exists) {
        & gh repo create $targetRepository --private --description 'Editor de identidad visual WERTBAU: colores, tipografias y aplicaciones en tiempo real.'
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el repositorio privado. La copia local queda intacta.' }
    }
    if ($remotes -notcontains $remoteName) { Run-Git -Arguments @('remote', 'add', $remoteName, $targetUrl) }
    Run-AuthenticatedGit -Arguments @('push', '--set-upstream', $remoteName, 'main')
    $published = & gh repo view $targetRepository --json nameWithOwner,isPrivate,url
    if ($LASTEXITCODE -ne 0) { throw 'El push termino, pero no se pudo verificar la ficha del repositorio.' }
    $verified = ($published -join "`n") | ConvertFrom-Json
    if ($verified.nameWithOwner -cne $targetRepository -or -not $verified.isPrivate) {
        throw 'La verificacion final del repositorio no coincide con el destino privado esperado.'
    }
    Write-Host "Repositorio privado actualizado: $($verified.url)"
    Write-Host 'Los proyectos JSON y las variantes del navegador se exportan por separado desde la aplicacion.'
} finally {
    Pop-Location
}
