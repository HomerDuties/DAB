@echo off
REM ============================================================
REM  Render-all.bat - regenere TOUS les diagrammes Mermaid
REM  du dossier web\architecture en SVG.
REM
REM  Style harmonise (fichier mermaid.config.json) :
REM    - theme dark
REM    - traits / fleches de relation en rouge (#e63946)
REM    - fond : anthracite chaud #2B2925 (option -b ; texte clair lisible)
REM      Alternatives si besoin (1 seule ligne a changer, set BG=...) :
REM        #F4F1EA  : ivoire chaud (trop clair => ecran)
REM        #3B362E  : taupe sombre, un peu moins sombre
REM        #1F1E1B  : quasi-noir chaud
REM
REM  Usage : double-clic, ou depuis un terminal :
REM          web\architecture\render-all.bat
REM ============================================================
setlocal
cd /d "%~dp0"

set CONFIG=mermaid.config.json
set BG=#2B2925
set CLI=npx -y -p @mermaid-js/mermaid-cli mmdc

echo === ARCHITECTURE.mmd  -^> archiDAB_server.svg
call %CLI% -i ARCHITECTURE.mmd -o archiDAB_server.svg -c %CONFIG% -b "%BG%"
if errorlevel 1 goto :err

echo === CABLAGE.mmd  -^> archiDAB_cablage.svg
call %CLI% -i CABLAGE.mmd -o archiDAB_cablage.svg -c %CONFIG% -b "%BG%"
if errorlevel 1 goto :err

echo === CLASSES.mmd  -^> archiDAB_classes.svg
call %CLI% -i CLASSES.mmd -o archiDAB_classes.svg -c %CONFIG% -b "%BG%"
if errorlevel 1 goto :err

echo === SEQUENCE.mmd  -^> archiDAB_sequence.svg
call %CLI% -i SEQUENCE.mmd -o archiDAB_sequence.svg -c %CONFIG% -b "%BG%"
if errorlevel 1 goto :err

echo === _hauteur.mmd  -^> archiDAB_hauteur.svg
call %CLI% -i _hauteur.mmd -o archiDAB_hauteur.svg -c %CONFIG% -b "%BG%"
if errorlevel 1 goto :err

echo.
echo OK : tous les SVG ont ete regeneres avec le meme style.
exit /b 0

:err
echo ECHEC du rendu (code %errorlevel%)
exit /b 1
