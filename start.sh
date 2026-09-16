#!/bin/bash

# Site documentation - serveur DEBUG
cd "$(dirname "$0")" || exit 1

echo "=============================================="
echo "  SITE DOCUMENTATION - MODE DEBUG"
echo "=============================================="
echo "[INFO] Dossier : $(pwd)"
echo

# Vérification de Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "[ERREUR] Node.js n'est pas installé."
    echo "Installe Node.js avec : sudo pacman -S nodejs npm"
    read -p "Appuyez sur Entrée pour continuer..."
    exit 1
fi

echo "[OK] Node.js détecté :"
node --version
echo

# Vérification de package.json
if [ ! -f "package.json" ]; then
    echo "[ERREUR] package.json introuvable."
    read -p "Appuyez sur Entrée pour continuer..."
    exit 1
fi

# Vérification du dossier data
if [ ! -d "data" ]; then
    echo "[ERREUR] Dossier data introuvable."
    read -p "Appuyez sur Entrée pour continuer..."
    exit 1
fi

# Vérification des fichiers JSON
echo "[INFO] Vérification des fichiers JSON..."

shopt -s nullglob
json_files=(data/*.json)

if [ ${#json_files[@]} -eq 0 ]; then
    echo "[INFO] Aucun fichier JSON trouvé dans data/"
else
    for file in "${json_files[@]}"; do
        echo "[JSON] $file"
    done
fi

echo

# Installation des dépendances
if [ ! -d "node_modules" ]; then
    echo "[INFO] node_modules absent : installation des dépendances..."
    npm install

    if [ $? -ne 0 ]; then
        echo "[ERREUR] npm install a échoué."
        read -p "Appuyez sur Entrée pour continuer..."
        exit 1
    fi

    echo
fi

# Lancement du serveur
echo "[INFO] Lancement du serveur..."
echo "[INFO] Les logs du serveur vont apparaître ci-dessous."
echo "[INFO] Pour arrêter : Ctrl+C"
echo

# Ouvre le navigateur par défaut
xdg-open "http://localhost:3000" >/dev/null 2>&1 &

# Lance le serveur
node server.js

echo
echo "=============================================="
echo "  SERVEUR ARRÊTÉ"
echo "=============================================="

read -p "Appuyez sur Entrée pour continuer..."