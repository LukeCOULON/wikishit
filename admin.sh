#!/bin/bash

# Administration locale - Documentation
cd "$(dirname "$0")" || exit 1

# Vérification de Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "[ERREUR] Node.js est requis."
    read -p "Appuyez sur Entrée pour continuer..."
    exit 1
fi

# Vérification de npm
if ! command -v npm >/dev/null 2>&1; then
    echo "[ERREUR] npm est requis."
    read -p "Appuyez sur Entrée pour continuer..."
    exit 1
fi

# Installation des dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installation des dépendances..."
    npm install

    if [ $? -ne 0 ]; then
        echo "[ERREUR] npm install a échoué."
        read -p "Appuyez sur Entrée pour continuer..."
        exit 1
    fi
fi

echo
echo "[INFO] Lancement de l'administration LOCALE..."
echo "[INFO] Elle écoute uniquement sur 127.0.0.1:3001"
echo

# Ouvre le navigateur par défaut
xdg-open "http://127.0.0.1:3001" >/dev/null 2>&1 &

# Lance le serveur
node admin/server.js

read -p "Appuyez sur Entrée pour continuer..."