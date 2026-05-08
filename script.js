console.log("Script démarré");

try {
    // STRUCTURE DE DONNÉES CHAMPIONNAT
    let championship = {
        currentDay: 1,
        days: {
            1: {
                players: { 1: [], 2: [], 3: [] },
                matches: { 1: [], 2: [], 3: [] },
                locked: false
            }
        }
    };

    console.log("Variables globales créées");
    window.championship = championship; // Rendre accessible globalement

    let importedChampionshipData = null;

    // FONCTION SHOWNOTIFICATION (DÉFINIE AVANT TOUT)
    function showNotification(message, type = 'info') {
        console.log(`[NOTIFICATION ${type.toUpperCase()}] ${message}`);
        
        if (typeof document === 'undefined') {
            return;
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Style de base
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '15px';
        notification.style.borderRadius = '5px';
        notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        notification.style.zIndex = '10000';
        notification.style.transition = 'all 0.3s ease';

        // Styles par type
        switch(type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                notification.style.color = 'white';
                break;
            case 'warning':
                notification.style.backgroundColor = '#FFC107';
                notification.style.color = 'black';
                break;
            case 'error':
                notification.style.backgroundColor = '#F44336';
                notification.style.color = 'white';
                break;
            default:
                notification.style.backgroundColor = '#2196F3';
                notification.style.color = 'white';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }
    window.showNotification = showNotification;
    console.log("showNotification définie");

    // SAUVEGARDE LOCAL STORAGE
    function saveToLocalStorage() {
        try {
            localStorage.setItem('tennisTableChampionship', JSON.stringify(championship));
            console.log("Données sauvegardées");
        } catch (error) {
            console.warn("Erreur sauvegarde:", error);
        }
    }

    function loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('tennisTableChampionship');
            if (saved) {
                championship = JSON.parse(saved);
                console.log("Données chargées depuis localStorage");
                return true;
            }
        } catch (error) {
            console.warn("Erreur chargement:", error);
        }
        return false;
    }

    // FONCTIONS DE SIMILARITÉ (DÉTECTION DE DOUBLONS)
    function normalizeForComparison(str) {
        return str.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[-\s]+/g, ' ')
            .trim();
    }

    function levenshteinDistance(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    function calculateSimilarity(a, b) {
        const normA = normalizeForComparison(a);
        const normB = normalizeForComparison(b);
        if (normA === normB) return 1.0;
        const maxLen = Math.max(normA.length, normB.length);
        if (maxLen === 0) return 1.0;
        const dist = levenshteinDistance(normA, normB);
        return 1 - dist / maxLen;
    }

    function findSimilarPlayers(threshold = 0.75) {
        const results = { 1: [], 2: [], 3: [] };
        for (let division = 1; division <= 3; division++) {
            const allNames = new Set();
            Object.values(championship.days).forEach(day => {
                if (day.players && day.players[division]) {
                    day.players[division].forEach(name => allNames.add(name));
                }
            });
            const names = Array.from(allNames).sort();
            for (let i = 0; i < names.length; i++) {
                for (let j = i + 1; j < names.length; j++) {
                    const similarity = calculateSimilarity(names[i], names[j]);
                    if (similarity >= threshold) {
                        results[division].push({ name1: names[i], name2: names[j], similarity });
                    }
                }
            }
            results[division].sort((a, b) => b.similarity - a.similarity);
        }
        return results;
    }

    // FONCTIONS DE BASE
    function addPlayer() {
        console.log("addPlayer appelée");
        const name = document.getElementById('playerName').value.trim();
        const division = parseInt(document.getElementById('playerDivision').value);
        const targetDay = parseInt(document.getElementById('targetDay').value);

        if (!name || name === '') {
            showNotification('Veuillez entrer un nom de joueur', 'warning');
            return;
        }

        // Vérifier si la journée est verrouillée
        if (!checkLockAndConfirm(targetDay, 'Ajouter un joueur')) {
            return;
        }

        if (!championship.days[targetDay]) {
            championship.days[targetDay] = {
                players: { 1: [], 2: [], 3: [] },
                matches: { 1: [], 2: [], 3: [] }
            };
        }

        if (championship.days[targetDay].players[division].includes(name)) {
            showNotification(`${name} est déjà inscrit en D${division} - J${targetDay}`, 'warning');
            return;
        }

        championship.days[targetDay].players[division].push(name);
        saveToLocalStorage();
        showNotification(`${name} ajouté à D${division} - J${targetDay}`, 'success');

        updatePlayersDisplay(targetDay);
        document.getElementById('playerName').value = '';
    }
    window.addPlayer = addPlayer;

    function showBulkInput() {
        console.log("showBulkInput appelée");
        const division = document.getElementById('bulkDivision').value;
        const targetDay = document.getElementById('bulkTargetDay').value;
        document.getElementById('selectedDivision').textContent = `Division ${division} - Journée ${targetDay}`;
        document.getElementById('bulkModal').style.display = 'block';
        document.getElementById('bulkText').focus();
        
        document.getElementById('bulkModal').dataset.dayNumber = targetDay;
        document.getElementById('bulkModal').dataset.division = division;
    }
    window.showBulkInput = showBulkInput;

    function closeBulkModal() {
        document.getElementById('bulkModal').style.display = 'none';
        document.getElementById('bulkText').value = '';
    }
    window.closeBulkModal = closeBulkModal;

    function addBulkPlayers() {
        console.log("addBulkPlayers appelée");
        const text = document.getElementById('bulkText').value.trim();
        const modal = document.getElementById('bulkModal');
        const dayNumber = parseInt(modal.dataset.dayNumber) || parseInt(document.getElementById('bulkTargetDay').value);
        const division = parseInt(modal.dataset.division) || parseInt(document.getElementById('bulkDivision').value);
        
        if (!text) {
            alert('Veuillez entrer au moins un nom de joueur');
            return;
        }
        
        const names = text.split('\n')
                         .map(name => name.trim())
                         .filter(name => name.length > 0);
        
        let added = 0;
        let duplicates = [];
        
        if (!championship.days[dayNumber]) {
            championship.days[dayNumber] = {
                players: { 1: [], 2: [], 3: [] },
                matches: { 1: [], 2: [], 3: [] }
            };
        }
        
        names.forEach(name => {
            if (!championship.days[dayNumber].players[division].includes(name)) {
                championship.days[dayNumber].players[division].push(name);
                added++;
            } else {
                duplicates.push(name);
            }
        });
        
        updatePlayersDisplay(dayNumber);
        updateDaySelectors();
        saveToLocalStorage();
        
        let message = `✅ ${added} joueurs ajoutés à la Division ${division} - Journée ${dayNumber} !`;
        if (duplicates.length > 0) {
            message += `\n\n⚠️ Joueurs déjà présents (ignorés): ${duplicates.join(', ')}`;
        }
        
        alert(message);
        closeBulkModal();
    }
    window.addBulkPlayers = addBulkPlayers;

    function updatePlayersDisplay(dayNumber) {
        console.log("updatePlayersDisplay appelée pour journée", dayNumber);
        if (!championship.days[dayNumber]) return;
        
        for (let division = 1; division <= 3; division++) {
            const container = document.getElementById(`division${dayNumber}-${division}-players`);
            if (!container) continue;
            
            const players = championship.days[dayNumber].players[division];
            
            if (players.length === 0) {
                container.innerHTML = '<div class="empty-state">Aucun joueur</div>';
            } else {
                container.innerHTML = players.map(player => {
                    const escapedPlayer = player.replace(/'/g, "\\'");
                    return `<div class="player-tag" onclick="showPlayerDetails(${dayNumber}, ${division}, '${escapedPlayer}')">
                        ${player}
                        <button class="edit-player" onclick="event.stopPropagation(); showEditPlayerModal(${dayNumber}, ${division}, '${escapedPlayer}')" title="Modifier">✏️</button>
                        <button class="remove-player" onclick="event.stopPropagation(); showDeletePlayerModal(${dayNumber}, ${division}, '${escapedPlayer}')" title="Supprimer">×</button>
                    </div>`;
                }).join('');
            }
        }
    }
    window.updatePlayersDisplay = updatePlayersDisplay;

    function removePlayer(dayNumber, division, playerName) {
        console.log("removePlayer appelée");

        // Vérifier si la journée est verrouillée
        if (!checkLockAndConfirm(dayNumber, 'Supprimer un joueur')) {
            return;
        }

        championship.days[dayNumber].players[division] = championship.days[dayNumber].players[division].filter(p => p !== playerName);
        championship.days[dayNumber].matches[division] = championship.days[dayNumber].matches[division].filter(match =>
            match.player1 !== playerName && match.player2 !== playerName
        );
        updatePlayersDisplay(dayNumber);
        updateMatchesDisplay(dayNumber);
        updateStats(dayNumber);
        saveToLocalStorage();
        showNotification(`${playerName} supprimé`, 'warning');
    }
    window.removePlayer = removePlayer;

    // ÉDITION DE JOUEUR
    let editPlayerData = null;

    function showEditPlayerModal(dayNumber, division, playerName) {
        editPlayerData = { dayNumber, division, playerName };

        document.getElementById('currentPlayerName').textContent = playerName;
        document.getElementById('currentPlayerDivision').textContent = `Division ${division}`;
        document.getElementById('newPlayerName').value = playerName;

        // Calculer l'impact de la modification
        let totalDays = 0;
        let totalMatches = 0;

        Object.keys(championship.days).forEach(day => {
            const dayNum = parseInt(day);
            if (championship.days[dayNum].players[division].includes(playerName)) {
                totalDays++;
                const matchesInDay = championship.days[dayNum].matches[division].filter(match =>
                    match.player1 === playerName || match.player2 === playerName
                ).length;
                totalMatches += matchesInDay;
            }
        });

        document.getElementById('editPlayerInfo').innerHTML =
            `<strong>📊 Impact de la modification :</strong><br>
            • Présent dans <strong>${totalDays}</strong> journée(s)<br>
            • <strong>${totalMatches}</strong> match(s) seront mis à jour`;

        document.getElementById('editPlayerModal').style.display = 'flex';

        // Focus sur le champ de saisie
        setTimeout(() => {
            const input = document.getElementById('newPlayerName');
            input.focus();
            input.select();
        }, 100);
    }
    window.showEditPlayerModal = showEditPlayerModal;

    function closeEditPlayerModal() {
        document.getElementById('editPlayerModal').style.display = 'none';
        editPlayerData = null;
    }
    window.closeEditPlayerModal = closeEditPlayerModal;

    function confirmEditPlayer() {
        if (!editPlayerData) {
            console.error('editPlayerData est null');
            closeEditPlayerModal();
            return;
        }

        const newName = document.getElementById('newPlayerName').value.trim();

        if (!newName) {
            showNotification('Le nom ne peut pas être vide', 'error');
            return;
        }

        if (newName === editPlayerData.playerName) {
            showNotification('Le nouveau nom est identique à l\'ancien', 'warning');
            closeEditPlayerModal();
            return;
        }

        // Vérifier si le nouveau nom existe déjà dans la même division
        // Un conflit existe seulement si le nouveau nom existe dans une journée où l'ancien nom n'existe pas
        const nameExists = Object.keys(championship.days).some(day => {
            const dayNum = parseInt(day);
            const playersInDivision = championship.days[dayNum].players[editPlayerData.division];
            const newNameExists = playersInDivision.includes(newName);
            const oldNameExists = playersInDivision.includes(editPlayerData.playerName);
            // Conflit uniquement si le nouveau nom existe ET l'ancien nom n'existe PAS (c'est un autre joueur)
            return newNameExists && !oldNameExists;
        });

        if (nameExists) {
            // Demander confirmation à l'utilisateur
            const confirmMsg = `Un joueur nommé "${newName}" existe déjà dans la Division ${editPlayerData.division}.\n\nEst-ce le même joueur (correction de faute de frappe) ?\n\nCliquez OK pour confirmer, ou Annuler pour abandonner.`;
            if (!confirm(confirmMsg)) {
                return;
            }
        }

        // Effectuer la modification
        editPlayerName(editPlayerData.playerName, newName, editPlayerData.division);

        // Fermer le modal
        closeEditPlayerModal();
    }
    window.confirmEditPlayer = confirmEditPlayer;

    function editPlayerName(oldName, newName, division) {
        console.log(`Édition du joueur: ${oldName} -> ${newName} dans Division ${division}`);

        // Si on n'est PAS sur le Hub Central, vérifier si des journées verrouillées seraient affectées
        if (championship.currentDay !== 1) {
            const lockedDaysAffected = Object.keys(championship.days).filter(day => {
                const dayNum = parseInt(day);
                return isDayLocked(dayNum) && championship.days[dayNum].players[division].includes(oldName);
            });

            if (lockedDaysAffected.length > 0) {
                const confirmMsg = `🔒 MODIFICATION GLOBALE - JOURNÉES VERROUILLÉES AFFECTÉES\n\n` +
                                  `Cette modification affectera ${lockedDaysAffected.length} journée(s) verrouillée(s).\n\n` +
                                  `💡 Astuce : Depuis le Hub Central (Journée 1), vous pouvez éditer sans restrictions.\n\n` +
                                  `Continuer quand même ?`;

                if (!confirm(confirmMsg)) {
                    showNotification('Modification annulée', 'info');
                    return;
                }
            }
        }

        let daysUpdated = 0;
        let matchesUpdated = 0;

        // Parcourir toutes les journées
        Object.keys(championship.days).forEach(day => {
            const dayNum = parseInt(day);
            const dayData = championship.days[dayNum];

            // Mettre à jour dans le tableau des joueurs
            const playerIndex = championship.days[dayNum].players[division].indexOf(oldName);
            if (playerIndex !== -1) {
                championship.days[dayNum].players[division][playerIndex] = newName;
                daysUpdated++;
            }

            // Mettre à jour dans tous les matchs classiques
            championship.days[dayNum].matches[division].forEach(match => {
                if (match.player1 === oldName) {
                    match.player1 = newName;
                    matchesUpdated++;
                }
                if (match.player2 === oldName) {
                    match.player2 = newName;
                    matchesUpdated++;
                }
                if (match.winner === oldName) {
                    match.winner = newName;
                }
            });

            // Mettre à jour dans les poules et phases finales
            if (dayData.pools && dayData.pools.divisions) {
                const poolDiv = dayData.pools.divisions[division];
                if (poolDiv) {
                    if (poolDiv.pools) {
                        poolDiv.pools.forEach(pool => {
                            for (let i = 0; i < pool.length; i++) {
                                if (pool[i] === oldName) pool[i] = newName;
                            }
                        });
                    }
                    if (poolDiv.matches) {
                        poolDiv.matches.forEach(match => {
                            if (match.player1 === oldName) match.player1 = newName;
                            if (match.player2 === oldName) match.player2 = newName;
                            if (match.winner === oldName) match.winner = newName;
                        });
                    }
                }
            }
            
            if (dayData.pools && dayData.pools.manualFinalPhase && dayData.pools.manualFinalPhase.divisions) {
                const finalDiv = dayData.pools.manualFinalPhase.divisions[division];
                if (finalDiv) {
                    if (finalDiv.qualified) {
                        for (let i = 0; i < finalDiv.qualified.length; i++) {
                            if (finalDiv.qualified[i] === oldName) finalDiv.qualified[i] = newName;
                        }
                    }
                    if (finalDiv.rounds) {
                        Object.values(finalDiv.rounds).forEach(round => {
                            if (round.matches) {
                                round.matches.forEach(match => {
                                    if (match.player1 === oldName) match.player1 = newName;
                                    if (match.player2 === oldName) match.player2 = newName;
                                    if (match.winner === oldName) match.winner = newName;
                                });
                            }
                        });
                    }
                }
            }
        });

        // Sauvegarder et rafraîchir l'affichage
        saveToLocalStorage();

        // Rafraîchir tous les affichages
        Object.keys(championship.days).forEach(day => {
            const dayNum = parseInt(day);
            updatePlayersDisplay(dayNum);
            updateMatchesDisplay(dayNum);
            updateStats(dayNum);
            if (typeof updatePoolsDisplay === 'function') updatePoolsDisplay(dayNum);
            if (typeof updateManualFinalPhaseDisplay === 'function') updateManualFinalPhaseDisplay(dayNum);
        });
        if (typeof updateGeneralRanking === 'function') updateGeneralRanking();

        showNotification(`${oldName} renommé en ${newName} (${daysUpdated} journée(s), ${matchesUpdated} match(s) mis à jour)`, 'success');
    }
    window.editPlayerName = editPlayerName;

    // SUPPRESSION DE JOUEUR AVEC CONFIRMATION
    let deletePlayerData = null;

    function showDeletePlayerModal(dayNumber, division, playerName) {
        deletePlayerData = { dayNumber, division, playerName };

        document.getElementById('deletePlayerName').textContent = playerName;

        // Calculer l'impact de la suppression
        let totalDays = 0;
        let totalMatches = 0;
        let matchDetails = [];

        Object.keys(championship.days).forEach(day => {
            const dayNum = parseInt(day);
            if (championship.days[dayNum].players[division].includes(playerName)) {
                totalDays++;
                const matchesInDay = championship.days[dayNum].matches[division].filter(match =>
                    match.player1 === playerName || match.player2 === playerName
                );
                totalMatches += matchesInDay.length;

                if (matchesInDay.length > 0) {
                    matchDetails.push(`Journée ${dayNum}: ${matchesInDay.length} match(s)`);
                }
            }
        });

        let statsHTML = `
            <strong>📊 Cette suppression affectera :</strong><br>
            • <strong>${totalDays}</strong> journée(s)<br>
            • <strong>${totalMatches}</strong> match(s) seront supprimés<br>
        `;

        if (matchDetails.length > 0) {
            statsHTML += `<br><strong>Détails :</strong><br>`;
            matchDetails.forEach(detail => {
                statsHTML += `• ${detail}<br>`;
            });
        }

        document.getElementById('deletePlayerStats').innerHTML = statsHTML;
        document.getElementById('deletePlayerModal').style.display = 'flex';
    }
    window.showDeletePlayerModal = showDeletePlayerModal;

    function closeDeletePlayerModal() {
        document.getElementById('deletePlayerModal').style.display = 'none';
        deletePlayerData = null;
    }
    window.closeDeletePlayerModal = closeDeletePlayerModal;

    function confirmDeletePlayer() {
        if (!deletePlayerData) return;

        const { playerName, division } = deletePlayerData;

        // Supprimer le joueur de toutes les journées
        removePlayerGlobally(playerName, division);

        closeDeletePlayerModal();
    }
    window.confirmDeletePlayer = confirmDeletePlayer;

    function removePlayerGlobally(playerName, division) {
        console.log(`Suppression globale du joueur: ${playerName} de Division ${division}`);

        let daysUpdated = 0;
        let matchesDeleted = 0;

        // Parcourir toutes les journées
        Object.keys(championship.days).forEach(day => {
            const dayNum = parseInt(day);

            // Vérifier si le joueur est présent dans cette journée
            const wasPresent = championship.days[dayNum].players[division].includes(playerName);

            if (wasPresent) {
                daysUpdated++;

                // Supprimer du tableau des joueurs
                championship.days[dayNum].players[division] =
                    championship.days[dayNum].players[division].filter(p => p !== playerName);

                // Compter et supprimer les matchs
                const matchesBefore = championship.days[dayNum].matches[division].length;
                championship.days[dayNum].matches[division] =
                    championship.days[dayNum].matches[division].filter(match =>
                        match.player1 !== playerName && match.player2 !== playerName
                    );
                const matchesAfter = championship.days[dayNum].matches[division].length;
                matchesDeleted += (matchesBefore - matchesAfter);
            }
        });

        // Sauvegarder et rafraîchir l'affichage
        saveToLocalStorage();

        // Rafraîchir tous les affichages
        Object.keys(championship.days).forEach(day => {
            const dayNum = parseInt(day);
            updatePlayersDisplay(dayNum);
            updateMatchesDisplay(dayNum);
            updateStats(dayNum);
        });

        showNotification(`${playerName} supprimé de ${daysUpdated} journée(s) (${matchesDeleted} match(s) supprimés)`, 'warning');
    }
    window.removePlayerGlobally = removePlayerGlobally;

    // GESTION DES ONGLETS ET JOURNÉES
    function addNewDay() {
        const existingDays = Object.keys(championship.days).map(Number);
        const newDayNumber = Math.max(...existingDays) + 1;

        // Verrouiller toutes les journées précédentes (sauf Journée 1 - Hub Central)
        existingDays.forEach(dayNum => {
            if (dayNum !== 1) {
                championship.days[dayNum].locked = true;
            }
        });

        championship.days[newDayNumber] = {
            players: { 1: [], 2: [], 3: [] },
            matches: { 1: [], 2: [], 3: [] },
            locked: false
        };

        createDayTab(newDayNumber);
        createDayContent(newDayNumber);
        updateDaySelectors();
        updateTabsDisplay();
        switchTab(newDayNumber);
        updateDayTabsBadges(); // Mettre à jour les badges
        saveToLocalStorage();

        showNotification(`Journée ${newDayNumber} créée !`, 'success');
    }
    window.addNewDay = addNewDay;

    function updateDaySelectors() {
        const dayNumbers = Object.keys(championship.days).sort((a, b) => Number(a) - Number(b));
        
        const selectors = ['targetDay', 'fileTargetDay', 'bulkTargetDay'];
        
        selectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (selector) {
                const currentValue = selector.value;
                selector.innerHTML = '';
                
                dayNumbers.forEach(dayNum => {
                    const option = document.createElement('option');
                    option.value = dayNum;
                    option.textContent = `→ Journée ${dayNum}`;
                    selector.appendChild(option);
                });
                
                if (dayNumbers.includes(currentValue)) {
                    selector.value = currentValue;
                } else {
                    selector.value = Math.max(...dayNumbers.map(Number)).toString();
                }
            }
        });
    }

    function createDayTab(dayNumber) {
        const tabsContainer = document.getElementById('tabs');
        const addButton = tabsContainer.querySelector('.add-day-btn');
        
        const newTab = document.createElement('button');
        newTab.className = 'tab';
        newTab.onclick = () => switchTab(dayNumber);
        newTab.dataset.day = dayNumber;
        
        if (dayNumber === 1) {
            newTab.innerHTML = `Journée ${dayNumber} <span style="font-size: 10px; opacity: 0.7;">(Hub Central)</span>`;
        } else {
            newTab.innerHTML = `
                Journée ${dayNumber}
                <button class="remove-day" onclick="event.stopPropagation(); removeDay(${dayNumber})" title="Supprimer">×</button>
            `;
        }
        
        tabsContainer.insertBefore(newTab, addButton);
    }

    function createDayContent(dayNumber) {
        const content = document.querySelector('.content');
        const generalRanking = document.getElementById('general-ranking');
        
        const dayContent = document.createElement('div');
        dayContent.className = 'tab-content day-content';
        dayContent.id = `day-${dayNumber}`;
        dayContent.innerHTML = generateDayContentHTML(dayNumber);
        
        content.insertBefore(dayContent, generalRanking);
        initializeDivisionsDisplay(dayNumber);
    }

    function generateDayContentHTML(dayNumber) {
        return `
            <div class="section">
                <h2>👥 Joueurs Journée ${dayNumber}</h2>
                
                <div style="text-align: center; margin-bottom: 20px;">
                    <p style="color: #7f8c8d; font-style: italic;">
                        Utilisez la <strong>Journée 1 (Hub Central)</strong> pour ajouter des joueurs à cette journée
                    </p>
                    <button class="btn" onclick="switchTab(1)" style="margin: 10px;">
                        ← Retour au Hub Central
                    </button>
                </div>
                
                <button class="btn" onclick="generateMatchesForDay(${dayNumber})" style="font-size: 18px; padding: 15px 25px; display: block; margin: 20px auto;">
                    🎯 Générer les Matchs Journée ${dayNumber}
                </button>
                
                <div class="control-buttons">
                    <button class="btn btn-success" onclick="updateRankingsForDay(${dayNumber})">
                        🏆 Classements J${dayNumber}
                    </button>
                    <button class="btn print-matches-btn" onclick="printMatchSheets(${dayNumber})" style="background: linear-gradient(135deg, #8e44ad, #9b59b6); color: white;" title="Imprimer les feuilles de match pour les arbitres">
                        📋 Imprimer Matchs
                    </button>
                    <button class="btn" onclick="showByeManagementModal(${dayNumber})" style="background: linear-gradient(135deg, #9b59b6, #8e44ad);">
                        🎯 Gérer BYE
                    </button>
                    <button class="btn" onclick="copyPlayersFromPreviousDay(${dayNumber})">
                        👥 Copier joueurs J${dayNumber-1}
                    </button>
                    <button class="btn btn-warning" onclick="clearDayData(${dayNumber})">
                        🗑️ Vider J${dayNumber}
                    </button>
                </div>
            </div>
            
            <div class="divisions" id="divisions-${dayNumber}">
            </div>
            
            <div class="rankings-section" id="rankings-${dayNumber}" style="display: none;">
                <div class="rankings-header">
                    <div class="rankings-title">🏆 Classements Journée ${dayNumber}</div>
                    <div class="rankings-toggle">
                        <button class="toggle-btn active" onclick="showRankingsForDay(${dayNumber}, 'points')">Par Points</button>
                        <button class="toggle-btn" onclick="showRankingsForDay(${dayNumber}, 'winrate')">Par % Victoires</button>
                    </div>
                </div>
                <div id="rankingsContent-${dayNumber}"></div>
            </div>
            
            <div class="stats" id="stats-${dayNumber}" style="display: none;">
                <h3>📊 Statistiques Journée ${dayNumber}</h3>
                <div class="stats-grid" id="statsContent-${dayNumber}"></div>
            </div>
        `;
    }

    function removeDay(dayNumber) {
        if (dayNumber === 1) {
            alert('⚠️ Impossible de supprimer la Journée 1 !\n\nLa Journée 1 est le Hub Central pour la gestion des joueurs.\nElle ne peut pas être supprimée.');
            return;
        }

        if (Object.keys(championship.days).length <= 1) {
            alert('Vous ne pouvez pas supprimer la dernière journée !');
            return;
        }

        if (confirm(`Supprimer définitivement la Journée ${dayNumber} ?\n\nTous les joueurs, matchs et scores seront perdus !`)) {
            const allDays = Object.keys(championship.days).map(Number).sort((a, b) => a - b);
            const maxDay = Math.max(...allDays);

            // Si on supprime la dernière journée, déverrouiller la nouvelle dernière
            if (dayNumber === maxDay && allDays.length > 1) {
                const newLastDay = allDays[allDays.length - 2];
                if (newLastDay !== 1) { // Sauf si c'est le Hub Central
                    championship.days[newLastDay].locked = false;
                }
            }

            delete championship.days[dayNumber];

            const tab = document.querySelector(`[data-day="${dayNumber}"]`);
            if (tab) tab.remove();

            const dayContent = document.getElementById(`day-${dayNumber}`);
            if (dayContent) dayContent.remove();

            const remainingDays = Object.keys(championship.days).map(Number);
            switchTab(Math.min(...remainingDays));

            updateDaySelectors();
            updateDayTabsBadges(); // Mettre à jour les badges
            saveToLocalStorage();
            showNotification(`Journée ${dayNumber} supprimée`, 'warning');
        }
    }
    window.removeDay = removeDay;

    // SYSTÈME DE VERROUILLAGE DES JOURNÉES
    function isDayLocked(dayNumber) {
        // La Journée 1 (Hub Central) n'est JAMAIS verrouillée
        if (dayNumber === 1) return false;

        // Vérifier si la journée existe et est verrouillée
        if (!championship.days[dayNumber]) return false;

        return championship.days[dayNumber].locked === true;
    }
    window.isDayLocked = isDayLocked;

    function attemptUnlockDay(dayNumber) {
        if (dayNumber === 1) return true; // Hub Central toujours déverrouillé

        const confirmMsg = `⚠️ JOURNÉE VERROUILLÉE\n\n` +
                          `La Journée ${dayNumber} est verrouillée car ce n'est plus la journée active.\n\n` +
                          `Voulez-vous la déverrouiller temporairement pour effectuer des corrections ?\n\n` +
                          `⚠️ Note : Le verrouillage sera restauré au prochain rechargement.`;

        if (confirm(confirmMsg)) {
            championship.days[dayNumber].locked = false;
            updateDayTabsBadges(); // Mettre à jour l'affichage des badges
            saveToLocalStorage();
            showNotification(`Journée ${dayNumber} déverrouillée temporairement`, 'info');
            return true;
        }

        return false;
    }
    window.attemptUnlockDay = attemptUnlockDay;

    function checkLockAndConfirm(dayNumber, actionName) {
        if (!isDayLocked(dayNumber)) return true;

        const confirmMsg = `🔒 MODIFICATION D'UNE ANCIENNE JOURNÉE\n\n` +
                          `Attention : vous tentez de modifier la Journée ${dayNumber} qui est verrouillée.\n\n` +
                          `Action : ${actionName}\n\n` +
                          `Voulez-vous déverrouiller temporairement cette journée ?`;

        if (confirm(confirmMsg)) {
            championship.days[dayNumber].locked = false;
            updateDayTabsBadges();
            saveToLocalStorage();
            showNotification(`Journée ${dayNumber} déverrouillée pour : ${actionName}`, 'warning');
            return true;
        }

        showNotification('Action annulée - Journée verrouillée', 'error');
        return false;
    }
    window.checkLockAndConfirm = checkLockAndConfirm;

    function updateDayTabsBadges() {
        const allDays = Object.keys(championship.days).map(Number);

        allDays.forEach(dayNum => {
            const tab = document.querySelector(`[data-day="${dayNum}"]`);
            if (!tab) return;

            // Retirer tous les badges existants
            const existingBadge = tab.querySelector('.lock-badge');
            if (existingBadge) existingBadge.remove();

            // Ne pas ajouter de badge sur le Hub Central
            if (dayNum === 1) return;

            const isLocked = isDayLocked(dayNum);

            if (isLocked || championship.days[dayNum].locked === false) {
                const badge = document.createElement('span');
                badge.className = 'lock-badge';

                if (isLocked) {
                    badge.innerHTML = '🔒';
                    badge.title = 'Journée verrouillée - Cliquez pour modifier';
                    badge.style.color = '#e74c3c';
                } else {
                    // Journée déverrouillée temporairement
                    const allDays = Object.keys(championship.days).map(Number).sort((a, b) => a - b);
                    const maxDay = Math.max(...allDays);

                    if (dayNum !== maxDay && dayNum !== 1) {
                        badge.innerHTML = '🔓';
                        badge.title = 'Journée déverrouillée temporairement';
                        badge.style.color = '#f39c12';
                    }
                }

                if (badge.innerHTML) {
                    tab.appendChild(badge);
                }
            }
        });
    }
    window.updateDayTabsBadges = updateDayTabsBadges;

    function switchTab(dayNumber) {
        championship.currentDay = dayNumber;
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const targetTab = document.querySelector(`[data-day="${dayNumber}"]`);
        const targetContent = document.getElementById(`day-${dayNumber}`);
        
        if (targetTab) targetTab.classList.add('active');
        if (targetContent) targetContent.classList.add('active');
    }
    window.switchTab = switchTab;

    function switchToGeneralRanking() {
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const generalTab = document.querySelector('[data-tab="general"]');
        const generalContent = document.getElementById('general-ranking');
        
        if (generalTab) generalTab.classList.add('active');
        if (generalContent) generalContent.classList.add('active');
        
        updateGeneralRanking();
    }
    window.switchToGeneralRanking = switchToGeneralRanking;

    function updateTabsDisplay() {
        const tabsContainer = document.getElementById('tabs');
        if (!tabsContainer) return;
        
        const existingTabs = tabsContainer.querySelectorAll('.tab:not(.general-ranking)');
        
        existingTabs.forEach(tab => {
            if (!tab.classList.contains('add-day-btn')) {
                tab.remove();
            }
        });
        
        const addButton = tabsContainer.querySelector('.add-day-btn');
        const generalTab = tabsContainer.querySelector('.general-ranking');
        
        Object.keys(championship.days).sort((a, b) => Number(a) - Number(b)).forEach(dayNumber => {
            const tab = document.createElement('button');
            tab.className = 'tab';
            if (Number(dayNumber) === championship.currentDay) {
                tab.classList.add('active');
            }
            tab.onclick = () => switchTab(Number(dayNumber));
            tab.dataset.day = dayNumber;
            
            if (Number(dayNumber) === 1) {
                tab.innerHTML = `Journée ${dayNumber}`;
            } else {
                tab.innerHTML = `
                    Journée ${dayNumber}
                    <button class="remove-day" onclick="event.stopPropagation(); removeDay(${dayNumber})" title="Supprimer">×</button>
                `;
            }
            
            tabsContainer.insertBefore(tab, addButton);
        });
    }

    function initializeAllDaysContent() {
        Object.keys(championship.days).forEach(dayNumber => {
            const dayNum = Number(dayNumber);
            if (dayNum > 1) {
                createDayContent(dayNum);
            }
            initializeDivisionsDisplay(dayNum);
            updatePlayersDisplay(dayNum);
            updateMatchesDisplay(dayNum);
            updateStats(dayNum);
            //nouveau pour les pools
            initializePoolsForDay(dayNum);
        });
    }

    // GÉNÉRATION DES MATCHS
    function generateMatchesForDay(dayNumber) {
        if (!dayNumber) {
            dayNumber = championship.currentDay;
        }

        // Vérifier si la journée est verrouillée
        if (!checkLockAndConfirm(dayNumber, 'Générer les matchs')) {
            return;
        }

        const dayData = championship.days[dayNumber];
        if (!dayData) return;

        // NOUVEAU: Vérifier si le mode poules est activé
        if (dayData.pools && dayData.pools.enabled) {
        alert('⚠️ Mode Poules activé !\n\nUtilisez les boutons "Générer les Poules" dans la section bleue ci-dessus.');
        return;
        }
        
        let reportDetails = {
            totalNewMatches: 0,
            totalRematches: 0,
            divisions: {}
        };
        
        for (let division = 1; division <= 3; division++) {
            const divisionPlayers = [...dayData.players[division]];
            
            if (divisionPlayers.length < 2) {
                if (divisionPlayers.length === 1) {
                    alert(`Journée ${dayNumber} - Division ${division}: Il faut au moins 2 joueurs pour générer des matchs`);
                }
                continue;
            }
            
            dayData.matches[division] = [];
            
            const matchHistory = new Map();
            
            for (let i = 0; i < divisionPlayers.length; i++) {
                for (let j = i + 1; j < divisionPlayers.length; j++) {
                    const key = [divisionPlayers[i], divisionPlayers[j]].sort().join('|vs|');
                    matchHistory.set(key, 0);
                }
            }
            
            Object.keys(championship.days).forEach(day => {
                const dayNum = parseInt(day);
                
                if (dayNum !== dayNumber && 
                    championship.days[dayNum] && 
                    championship.days[dayNum].matches[division]) {
                    
                    championship.days[dayNum].matches[division].forEach(match => {
                        if (divisionPlayers.includes(match.player1) && 
                            divisionPlayers.includes(match.player2)) {
                            
                            const key = [match.player1, match.player2].sort().join('|vs|');
                            const currentCount = matchHistory.get(key) || 0;
                            matchHistory.set(key, currentCount + 1);
                        }
                    });
                }
            });
            
            const possibleMatches = [];
            for (let i = 0; i < divisionPlayers.length; i++) {
                for (let j = i + 1; j < divisionPlayers.length; j++) {
                    const player1 = divisionPlayers[i];
                    const player2 = divisionPlayers[j];
                    const key = [player1, player2].sort().join('|vs|');
                    const timesPlayed = matchHistory.get(key) || 0;
                    
                    possibleMatches.push({
                        player1: player1,
                        player2: player2,
                        timesPlayed: timesPlayed,
                        priority: timesPlayed === 0 ? 0 : timesPlayed + 10,
                        key: key,
                        randomOrder: Math.random()
                    });
                }
            }
            
            possibleMatches.sort((a, b) => {
                if (a.priority !== b.priority) return a.priority - b.priority;
                return a.randomOrder - b.randomOrder;
            });
            
            const playersMatchCount = new Map();
            divisionPlayers.forEach(p => playersMatchCount.set(p, 0));
            
            const targetMatchesPerPlayer = 4;
            const matchesByTour = { 1: [], 2: [], 3: [], 4: [] };
            const usedMatches = new Set();
            
            for (let tour = 1; tour <= 4; tour++) {
                const playersInThisTour = new Set();
                
                for (const matchPair of possibleMatches) {
                    if (usedMatches.has(matchPair.key)) continue;
                    
                    if (!playersInThisTour.has(matchPair.player1) && 
                        !playersInThisTour.has(matchPair.player2)) {
                        
                        const p1Count = playersMatchCount.get(matchPair.player1) || 0;
                        const p2Count = playersMatchCount.get(matchPair.player2) || 0;
                        
                        if (p1Count < targetMatchesPerPlayer && p2Count < targetMatchesPerPlayer) {
                            
                            const matchData = {
                                player1: matchPair.player1,
                                player2: matchPair.player2,
                                tour: tour,
                                sets: [
                                    { player1Score: '', player2Score: '' },
                                    { player1Score: '', player2Score: '' },
                                    { player1Score: '', player2Score: '' }
                                ],
                                completed: false,
                                winner: null,
                                timesPlayedBefore: matchPair.timesPlayed,
                                isRematch: matchPair.timesPlayed > 0
                            };
                            
                            matchesByTour[tour].push(matchData);
                            playersInThisTour.add(matchPair.player1);
                            playersInThisTour.add(matchPair.player2);
                            playersMatchCount.set(matchPair.player1, p1Count + 1);
                            playersMatchCount.set(matchPair.player2, p2Count + 1);
                            usedMatches.add(matchPair.key);
                            
                            if (matchPair.timesPlayed === 0) {
                                reportDetails.totalNewMatches++;
                            } else {
                                reportDetails.totalRematches++;
                            }
                        }
                    }
                    
                    if (matchesByTour[tour].length >= Math.ceil(divisionPlayers.length / 2)) {
                        break;
                    }
                }
            }
            
            for (let tour = 1; tour <= 4; tour++) {
                dayData.matches[division].push(...matchesByTour[tour]);
            }
            
            reportDetails.divisions[division] = {
                players: divisionPlayers.length,
                newMatches: dayData.matches[division].filter(m => !m.isRematch).length,
                rematches: dayData.matches[division].filter(m => m.isRematch).length,
                total: dayData.matches[division].length
            };
        }
        
        updateMatchesDisplay(dayNumber);
        updateStats(dayNumber);
        saveToLocalStorage();
        
        let summary = `✅ Matchs générés pour la Journée ${dayNumber} !\n\n`;
        
        for (let division = 1; division <= 3; division++) {
            if (reportDetails.divisions[division]) {
                const divStats = reportDetails.divisions[division];
                summary += `Division ${division}: ${divStats.players} joueurs\n`;
                summary += `  → ${divStats.newMatches} matchs INÉDITS`;
                if (divStats.rematches > 0) {
                    summary += ` + ${divStats.rematches} revanches`;
                }
                summary += ` = ${divStats.total} matchs total\n`;
            }
        }
        
        summary += `\n📊 Résumé global :\n`;
        summary += `• ${reportDetails.totalNewMatches} nouveaux matchs\n`;
        if (reportDetails.totalRematches > 0) {
            summary += `• ${reportDetails.totalRematches} revanches (minimisées)\n`;
        }
        summary += `\n💡 L'algorithme a priorisé les matchs jamais joués !`;
        
        alert(summary);
    }
    window.generateMatchesForDay = generateMatchesForDay;

    // AFFICHAGE DES MATCHS
    function updateMatchesDisplay(dayNumber) {
        const dayData = championship.days[dayNumber];
        if (!dayData) return;
        
        for (let division = 1; division <= 3; division++) {
            const container = document.getElementById(`division${dayNumber}-${division}-matches`);
            if (!container) continue;
            
            if (dayData.matches[division].length === 0) {
                container.innerHTML = '';
                continue;
            }
            
            const matchsByTour = {};
            dayData.matches[division].forEach(match => {
                if (!matchsByTour[match.tour]) {
                    matchsByTour[match.tour] = [];
                }
                matchsByTour[match.tour].push(match);
            });
            
            let html = '';
            
            for (let tour = 1; tour <= 4; tour++) {
                if (matchsByTour[tour] && matchsByTour[tour].length > 0) {
                    const tourMatches = matchsByTour[tour];
                    const completedMatches = tourMatches.filter(m => m.completed).length;
                    const totalMatches = tourMatches.length;
                    
                    html += `
                        <div class="tour-section">
                            <div class="tour-header" onclick="toggleTour(${dayNumber}, ${division}, ${tour})">
                                <div class="tour-title">🎯 Tour ${tour}</div>
                                <div class="tour-progress" id="progress-d${dayNumber}-div${division}-t${tour}">${completedMatches}/${totalMatches} terminés</div>
                            </div>
                            <div class="tour-matches" id="tour${dayNumber}-${division}-${tour}">
                    `;
                    
                    tourMatches.forEach((match, matchIndex) => {
                        const globalIndex = dayData.matches[division].indexOf(match);
                        const matchStatus = match.completed ? 'completed' : 'pending';
                        const statusClass = match.completed ? 'status-completed' : 'status-pending';
                        const statusText = match.completed ? 'Terminé' : 'En cours';
                        const collapsedClass = match.completed ? 'collapsed' : '';
                        const arrowIcon = match.completed ? '▶' : '▼';

                        html += `
                            <div class="match ${matchStatus} ${collapsedClass}" data-match-id="d${dayNumber}-div${division}-m${globalIndex}">
                                <div class="match-header" onclick="toggleMatch(${dayNumber}, ${division}, ${globalIndex})">
                                    <div class="match-header-left">
                                        <span class="match-collapse-arrow" id="match-arrow-${dayNumber}-${division}-${globalIndex}">${arrowIcon}</span>
                                        <div class="player-names">${match.player1} VS ${match.player2}</div>
                                    </div>
                                    <div class="match-header-right">
                                        <div class="match-status ${statusClass}" id="match-status-${dayNumber}-${division}-${globalIndex}">${statusText}</div>
                                        <div class="match-header-result" id="match-header-result-${dayNumber}-${division}-${globalIndex}">${match.completed && match.winner ? `🏆 ${match.winner}` : ''}</div>
                                    </div>
                                </div>
                                <div class="match-details" id="match-details-${dayNumber}-${division}-${globalIndex}">
                                <div class="sets-container">
                        `;

                        // Initialiser le tableau sets s'il n'existe pas
                        if (!match.sets || !Array.isArray(match.sets)) {
                            match.sets = [
                                { player1Score: '', player2Score: '' },
                                { player1Score: '', player2Score: '' },
                                { player1Score: '', player2Score: '' }
                            ];
                        }

                        for (let setIndex = 0; setIndex < 3; setIndex++) {
                            // Vérifier et initialiser le set si nécessaire
                            if (!match.sets[setIndex]) {
                                match.sets[setIndex] = { player1Score: '', player2Score: '' };
                            }

                            let setClass = 'set';
                            let setDisabled = '';

                            // Désactiver les inputs si la journée est verrouillée
                            if (isDayLocked(dayNumber)) {
                                setClass += ' set-disabled locked-input';
                                setDisabled = 'disabled';
                            }

                            html += `
                                <div class="${setClass}">
                                    <div class="set-label">Set ${setIndex + 1}</div>
                                    <div class="set-scores">
                                        <input type="number" class="score-input"
                                               placeholder="" min="0" max="30"
                                               value="${match.sets[setIndex].player1Score || ''}" 
                                               ${setDisabled}
                                               onchange="updateSetScore(${dayNumber}, ${division}, ${globalIndex}, ${setIndex}, 'player1Score', this.value)"
                                               onkeydown="handleEnterKey(event, ${dayNumber}, ${division}, ${globalIndex})">
                                        <span class="score-separator">-</span>
                                        <input type="number" class="score-input" 
                                               placeholder="" min="0" max="30"
                                               value="${match.sets[setIndex].player2Score || ''}"
                                               ${setDisabled}
                                               onchange="updateSetScore(${dayNumber}, ${division}, ${globalIndex}, ${setIndex}, 'player2Score', this.value)"
                                               onkeydown="handleEnterKey(event, ${dayNumber}, ${division}, ${globalIndex})">
                                    </div>
                                </div>
                            `;
                        }
                        
                        let resultText = 'En attente des résultats';
                        let resultClass = 'result-pending';
                        
                        if (match.completed && match.winner) {
                            let player1Sets = 0;
                            let player2Sets = 0;
                            
                            match.sets.forEach(set => {
                                if (set.player1Score !== '' && set.player2Score !== '') {
                                    const score1 = parseInt(set.player1Score);
                                    const score2 = parseInt(set.player2Score);
                                    
                                    if (score1 > score2) {
                                        player1Sets++;
                                    } else if (score2 > score1) {
                                        player2Sets++;
                                    }
                                }
                            });
                            
                            const winnerSets = match.winner === match.player1 ? player1Sets : player2Sets;
                            const loserSets = match.winner === match.player1 ? player2Sets : player1Sets;
                            
                            resultText = `🏆 ${match.winner} remporte le match (${winnerSets}-${loserSets})`;
                            resultClass = 'result-completed';
                        }
                        
                        html += `
                                </div>
                                <div class="match-result ${resultClass}" id="match-result-${dayNumber}-${division}-${globalIndex}">
                                    ${resultText}
                                </div>
                                </div>
                            </div>
                        `;
                    });
                    
                    html += `
                            </div>
                        </div>
                    `;
                }
            }
            
            container.innerHTML = html;
            
            setTimeout(() => {
                for (let div = 1; div <= 3; div++) {
                    const firstTour = document.getElementById(`tour${dayNumber}-${div}-1`);
                    if (firstTour) {
                        firstTour.classList.add('active');
                    }
                }
            }, 100);
        }
    }

    function toggleTour(dayNumber, division, tour) {
        const tourElement = document.getElementById(`tour${dayNumber}-${division}-${tour}`);
        if (tourElement) {
            tourElement.classList.toggle('active');
        }
    }
    window.toggleTour = toggleTour;

    function updateSetScore(dayNumber, division, matchIndex, setIndex, scoreField, value) {
        // Vérifier si la journée est verrouillée
        if (isDayLocked(dayNumber)) {
            if (!attemptUnlockDay(dayNumber)) {
                return; // Action annulée
            }
        }

        const cleanValue = value === null || value === undefined ? '' : String(value).trim();
        championship.days[dayNumber].matches[division][matchIndex].sets[setIndex][scoreField] = cleanValue;
        checkMatchCompletion(dayNumber, division, matchIndex);
        updateSingleMatchDisplay(dayNumber, division, matchIndex);
        saveToLocalStorage();
    }
    window.updateSetScore = updateSetScore;

    function handleEnterKey(event, dayNumber, division, matchIndex) {
        if (event.key === 'Enter') {
            const wasCompleted = championship.days[dayNumber].matches[division][matchIndex].completed;
            
            checkMatchCompletion(dayNumber, division, matchIndex);
            
            const isNowCompleted = championship.days[dayNumber].matches[division][matchIndex].completed;
            
            updateSingleMatchDisplay(dayNumber, division, matchIndex);
            saveToLocalStorage();
            
            const matchElement = document.querySelector(`[data-match-id="d${dayNumber}-div${division}-m${matchIndex}"]`);
            if (matchElement) {
                matchElement.style.transform = 'scale(1.02)';
                matchElement.style.boxShadow = '0 5px 20px rgba(27, 164, 60, 0.4)';
                matchElement.style.transition = 'all 0.3s ease';
                
                setTimeout(() => {
                    matchElement.style.transform = '';
                    matchElement.style.boxShadow = '';
                }, 400);
            }
            
            if (!wasCompleted && isNowCompleted) {
                setTimeout(() => {
                    if (matchElement) {
                        matchElement.style.background = '#d5f4e6';
                        matchElement.style.borderColor = '#27ae60';
                    }
                }, 200);
                
                showNotification(`Match terminé: ${championship.days[dayNumber].matches[division][matchIndex].winner} gagne!`, 'success');
            }
        }
    }
    window.handleEnterKey = handleEnterKey;

    function updateSingleMatchDisplay(dayNumber, division, matchIndex) {
        const match = championship.days[dayNumber].matches[division][matchIndex];
        const matchElement = document.querySelector(`[data-match-id="d${dayNumber}-div${division}-m${matchIndex}"]`);
        
        if (!matchElement) {
            console.warn(`updateSingleMatchDisplay: élément non trouvé pour d${dayNumber}-div${division}-m${matchIndex}`);
            return;
        }
        
        const statusElement = document.getElementById(`match-status-${dayNumber}-${division}-${matchIndex}`);
        if (statusElement) {
            if (match.completed) {
                statusElement.className = 'match-status status-completed';
                statusElement.textContent = 'Terminé';
                matchElement.classList.add('completed');
            } else {
                statusElement.className = 'match-status status-pending';
                statusElement.textContent = 'En cours';
                matchElement.classList.remove('completed');
            }
        }
        
        const arrowElement = document.getElementById(`match-arrow-${dayNumber}-${division}-${matchIndex}`);
        if (arrowElement) {
            arrowElement.textContent = matchElement.classList.contains('collapsed') ? '▶' : '▼';
        }
        
        const headerResultElement = document.getElementById(`match-header-result-${dayNumber}-${division}-${matchIndex}`);
        if (headerResultElement) {
            headerResultElement.textContent = match.completed && match.winner ? `🏆 ${match.winner}` : '';
        }
        
        const resultElement = document.getElementById(`match-result-${dayNumber}-${division}-${matchIndex}`);
        if (resultElement) {
            if (match.completed && match.winner) {
                let player1Sets = 0;
                let player2Sets = 0;
                
                match.sets.forEach(set => {
                    if (set.player1Score !== '' && set.player2Score !== '') {
                        const score1 = parseInt(set.player1Score);
                        const score2 = parseInt(set.player2Score);
                        if (score1 > score2) player1Sets++;
                        else if (score2 > score1) player2Sets++;
                    }
                });
                
                const winnerSets = match.winner === match.player1 ? player1Sets : player2Sets;
                const loserSets = match.winner === match.player1 ? player2Sets : player1Sets;
                
                resultElement.className = 'match-result result-completed';
                resultElement.textContent = `🏆 ${match.winner} remporte le match (${winnerSets}-${loserSets})`;
            } else {
                resultElement.className = 'match-result result-pending';
                resultElement.textContent = 'En attente des résultats';
            }
        }
        
        updateTourProgress(dayNumber, division, match.tour);
    }

    function updateTourProgress(dayNumber, division, tour) {
        const progressElement = document.getElementById(`progress-d${dayNumber}-div${division}-t${tour}`);
        if (!progressElement) return;
        
        const tourMatches = championship.days[dayNumber].matches[division].filter(m => m.tour === tour);
        const completedMatches = tourMatches.filter(m => m.completed).length;
        const totalMatches = tourMatches.length;
        
        progressElement.textContent = `${completedMatches}/${totalMatches} terminés`;
        
        progressElement.style.background = 'rgba(46, 204, 113, 0.3)';
        setTimeout(() => {
            progressElement.style.background = 'rgba(255,255,255,0.2)';
        }, 500);
    }

    function checkMatchCompletion(dayNumber, division, matchIndex) {
        const match = championship.days[dayNumber].matches[division][matchIndex];
        let player1Sets = 0;
        let player2Sets = 0;
        
        match.sets.forEach((set, index) => {
            if (set.player1Score !== '' && set.player2Score !== '') {
                const score1 = parseInt(set.player1Score);
                const score2 = parseInt(set.player2Score);
                
                if (!isNaN(score1) && !isNaN(score2)) {
                    if (score1 > score2) {
                        player1Sets++;
                    } else if (score2 > score1) {
                        player2Sets++;
                    }
                }
            }
        });
        
        match.completed = false;
        match.winner = null;
        
        if (player1Sets >= 2) {
            match.completed = true;
            match.winner = match.player1;
        } else if (player2Sets >= 2) {
            match.completed = true;
            match.winner = match.player2;
        }
    }

    // GESTION DES FICHIERS
    function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Vérifier si XLSX est disponible
        if (typeof XLSX === 'undefined') {
            alert('La bibliothèque XLSX n\'est pas chargée. Seuls les fichiers CSV sont supportés pour le moment.');
            
            // Traiter seulement les CSV
            if (!file.name.endsWith('.csv')) {
                alert('Veuillez utiliser un fichier CSV (.csv) pour l\'instant.');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const text = e.target.result;
                    const data = parseCSV(text);
                    const targetDay = parseInt(document.getElementById('fileTargetDay').value);
                    importPlayersFromData(data, targetDay);
                } catch (error) {
                    alert('Erreur lors de la lecture du fichier : ' + error.message);
                }
            };
            reader.readAsText(file);
            return;
        }
        
        const targetDay = parseInt(document.getElementById('fileTargetDay').value);
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                let data;
                
                if (file.name.endsWith('.csv')) {
                    const text = e.target.result;
                    data = parseCSV(text);
                } else {
                    const workbook = XLSX.read(e.target.result, { type: 'binary' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                }
                
                importPlayersFromData(data, targetDay);
                
            } catch (error) {
                alert('Erreur lors de la lecture du fichier : ' + error.message);
            }
        };
        
        if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    }

    function parseCSV(text) {
        const lines = text.split('\n');
        return lines.map(line => {
            return line.split(/[,;]/).map(cell => cell.trim().replace(/^"(.*)"$/, '$1'));
        }).filter(row => row[0] && row[0].trim());
    }

    function importPlayersFromData(data, dayNumber) {
        let imported = 0;
        let errors = [];
        
        data.forEach((row, index) => {
            if (row.length >= 2) {
                const name = String(row[0]).trim();
                const division = parseInt(row[1]);
                
                if (name && [1, 2, 3].includes(division)) {
                    if (!championship.days[dayNumber]) {
                        championship.days[dayNumber] = {
                            players: { 1: [], 2: [], 3: [] },
                            matches: { 1: [], 2: [], 3: [] }
                        };
                    }
                    if (!championship.days[dayNumber].players[division].includes(name)) {
                        championship.days[dayNumber].players[division].push(name);
                        imported++;
                    }
                } else {
                    errors.push(`Ligne ${index + 1}: "${row[0]}" division "${row[1]}" invalide`);
                }
            }
        });
        
        updatePlayersDisplay(dayNumber);
        updateDaySelectors();
        saveToLocalStorage();
        
        let message = `✅ ${imported} joueurs importés vers la Journée ${dayNumber} !`;
        if (errors.length > 0 && errors.length < 5) {
            message += '\n\n⚠️ Erreurs:\n' + errors.slice(0, 5).join('\n');
        } else if (errors.length >= 5) {
            message += `\n\n⚠️ ${errors.length} erreurs détectées. Vérifiez le format.`;
        }
        
        alert(message);
        document.getElementById('fileInput').value = '';
    }

    function copyPlayersFromPreviousDay(dayNumber) {
        const previousDay = dayNumber - 1;
        
        if (!championship.days[previousDay]) {
            alert(`Aucune journée ${previousDay} trouvée`);
            return;
        }
        
        const prevPlayers = championship.days[previousDay].players;
        let totalPlayers = 0;
        
        for (let division = 1; division <= 3; division++) {
            totalPlayers += prevPlayers[division].length;
        }
        
        if (totalPlayers === 0) {
            alert(`Aucun joueur à copier depuis la Journée ${previousDay}`);
            return;
        }
        
        const confirmMsg = `Copier les joueurs de la Journée ${previousDay} vers la Journée ${dayNumber} ?\n\n` +
                          `Division 1: ${prevPlayers[1].length} joueurs\n` +
                          `Division 2: ${prevPlayers[2].length} joueurs\n` +
                          `Division 3: ${prevPlayers[3].length} joueurs\n\n` +
                          `Total: ${totalPlayers} joueurs`;
        
        if (confirm(confirmMsg)) {
            for (let division = 1; division <= 3; division++) {
                championship.days[dayNumber].players[division] = [...prevPlayers[division]];
            }
            
            updatePlayersDisplay(dayNumber);
            saveToLocalStorage();
            
            showNotification(`${totalPlayers} joueurs copiés de J${previousDay} vers J${dayNumber}`, 'success');
        }
    }
    window.copyPlayersFromPreviousDay = copyPlayersFromPreviousDay;

    function clearDayData(dayNumber) {
        const dayData = championship.days[dayNumber];
        if (!dayData) return;
        
        let totalPlayers = 0;
        let totalMatches = 0;
        
        for (let division = 1; division <= 3; division++) {
            totalPlayers += dayData.players[division].length;
            totalMatches += dayData.matches[division].length;
        }
        
        if (totalPlayers === 0 && totalMatches === 0) {
            alert(`La Journée ${dayNumber} est déjà vide`);
            return;
        }
        
        const confirmMsg = `Vider complètement la Journée ${dayNumber} ?\n\n` +
                          `Cela supprimera :\n` +
                          `• ${totalPlayers} joueurs\n` +
                          `• ${totalMatches} matchs\n` +
                          `• Tous les scores\n\n` +
                          `Cette action est irréversible !`;
        
        if (confirm(confirmMsg)) {
            championship.days[dayNumber] = {
                players: { 1: [], 2: [], 3: [] },
                matches: { 1: [], 2: [], 3: [] }
            };
            
            updatePlayersDisplay(dayNumber);
            updateMatchesDisplay(dayNumber);
            updateStats(dayNumber);
            const rankingsEl = document.getElementById(`rankings-${dayNumber}`);
            if (rankingsEl) rankingsEl.style.display = 'none';
            
            saveToLocalStorage();
            showNotification(`Journée ${dayNumber} vidée`, 'warning');
        }
    }
    window.clearDayData = clearDayData;

    function initializeDivisionsDisplay(dayNumber = 1) {
        const divisionsContainer = document.getElementById(`divisions-${dayNumber}`);
        if (!divisionsContainer) return;

        divisionsContainer.innerHTML = `
            <div class="division division-1">
                <h3 class="division-header" onclick="togglePlayersSection(${dayNumber}, 1)">
                    <span class="division-title">🥇 Division 1</span>
                    <span class="collapse-arrow" id="arrow-${dayNumber}-1">▼</span>
                </h3>
                <div class="players-section" id="players-section-${dayNumber}-1">
                    <div class="players-list" id="division${dayNumber}-1-players">
                        <div class="empty-state">Aucun joueur</div>
                    </div>
                </div>
                <div class="matches-container" id="division${dayNumber}-1-matches"></div>
            </div>

            <div class="division division-2">
                <h3 class="division-header" onclick="togglePlayersSection(${dayNumber}, 2)">
                    <span class="division-title">🥈 Division 2</span>
                    <span class="collapse-arrow" id="arrow-${dayNumber}-2">▼</span>
                </h3>
                <div class="players-section" id="players-section-${dayNumber}-2">
                    <div class="players-list" id="division${dayNumber}-2-players">
                        <div class="empty-state">Aucun joueur</div>
                    </div>
                </div>
                <div class="matches-container" id="division${dayNumber}-2-matches"></div>
            </div>

            <div class="division division-3">
                <h3 class="division-header" onclick="togglePlayersSection(${dayNumber}, 3)">
                    <span class="division-title">🥉 Division 3</span>
                    <span class="collapse-arrow" id="arrow-${dayNumber}-3">▼</span>
                </h3>
                <div class="players-section" id="players-section-${dayNumber}-3">
                    <div class="players-list" id="division${dayNumber}-3-players">
                        <div class="empty-state">Aucun joueur</div>
                    </div>
                </div>
                <div class="matches-container" id="division${dayNumber}-3-matches"></div>
            </div>
        `;
    }

    // COLLAPSE/EXPAND DES SECTIONS DE JOUEURS
    function togglePlayersSection(dayNumber, division) {
        const section = document.getElementById(`players-section-${dayNumber}-${division}`);
        const arrow = document.getElementById(`arrow-${dayNumber}-${division}`);

        if (!section || !arrow) return;

        if (section.style.display === 'none') {
            section.style.display = 'block';
            arrow.textContent = '▼';
            arrow.classList.remove('collapsed');
        } else {
            section.style.display = 'none';
            arrow.textContent = '▶';
            arrow.classList.add('collapsed');
        }
    }
    window.togglePlayersSection = togglePlayersSection;

    // COLLAPSE/EXPAND DES MATCHS
    function toggleMatch(dayNumber, division, matchIndex) {
        const matchElement = document.querySelector(`[data-match-id="d${dayNumber}-div${division}-m${matchIndex}"]`);
        const detailsElement = document.getElementById(`match-details-${dayNumber}-${division}-${matchIndex}`);
        const arrowElement = document.getElementById(`match-arrow-${dayNumber}-${division}-${matchIndex}`);

        if (!matchElement || !detailsElement || !arrowElement) return;

        if (matchElement.classList.contains('collapsed')) {
            matchElement.classList.remove('collapsed');
            arrowElement.textContent = '▼';
        } else {
            matchElement.classList.add('collapsed');
            arrowElement.textContent = '▶';
        }
    }
    window.toggleMatch = toggleMatch;

    // STATISTIQUES ET CLASSEMENTS
    function calculatePlayerStats(dayNumber, division, playerName) {
        const dayData = championship.days[dayNumber];
        if (!dayData) return null;
        
        const playerMatches = dayData.matches[division].filter(match => 
            match.player1 === playerName || match.player2 === playerName
        );
        
        let wins = 0;
        let losses = 0;
        let forfaits = 0;
        let setsWon = 0;
        let setsLost = 0;
        let pointsWon = 0;
        let pointsLost = 0;
        let matchesPlayed = 0;
        
        playerMatches.forEach(match => {
            checkMatchCompletion(dayNumber, division, dayData.matches[division].indexOf(match));
            
            if (match.completed) {
                matchesPlayed++;
                const isPlayer1 = match.player1 === playerName;
                
                if (match.winner === playerName) {
                    if (match.isBye) {
                        forfaits++;
                    } else {
                        wins++;
                    }
                } else {
                    losses++;
                }
                
                match.sets.forEach(set => {
                    if (set.player1Score !== '' && set.player2Score !== '') {
                        const score1 = parseInt(set.player1Score);
                        const score2 = parseInt(set.player2Score);
                        
                        if (isPlayer1) {
                            pointsWon += score1;
                            pointsLost += score2;
                            if (score1 > score2) setsWon++;
                            else if (score2 > score1) setsLost++;
                        } else {
                            pointsWon += score2;
                            pointsLost += score1;
                            if (score2 > score1) setsWon++;
                            else if (score1 > score2) setsLost++;
                        }
                    }
                });
            }
        });
        
        const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;
        const totalPoints = wins * 3 + losses * 1 + forfaits * 3;
        
        return {
            matchesPlayed,
            wins,
            losses,
            forfaits,
            setsWon,
            setsLost,
            setsDiff: setsWon - setsLost,
            pointsWon,
            pointsLost,
            pointsDiff: pointsWon - pointsLost,
            winRate,
            totalPoints,
            matches: playerMatches
        };
    }

    function showPlayerDetails(dayNumber, division, playerName) {
        const stats = calculatePlayerStats(dayNumber, division, playerName);
        if (!stats) return;
        
        const playerNameTitle = document.getElementById('playerNameTitle');
        if (playerNameTitle) {
            playerNameTitle.textContent = `${playerName} - Division ${division} - Journée ${dayNumber}`;
        }
        
        const playerOverview = document.getElementById('playerOverview');
        if (playerOverview) {
            playerOverview.innerHTML = `
                <div class="overview-card">
                    <div class="overview-number">${stats.matchesPlayed}</div>
                    <div class="overview-label">Matchs joués</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${stats.wins}</div>
                    <div class="overview-label">Victoires</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${stats.winRate}%</div>
                    <div class="overview-label">% Victoires</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${stats.setsWon}/${stats.setsLost}</div>
                    <div class="overview-label">Sets G/P</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${stats.pointsWon}/${stats.pointsLost}</div>
                    <div class="overview-label">Points G/P</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${stats.totalPoints}</div>
                    <div class="overview-label">Points journée</div>
                </div>
            `;
        }
        
        let matchesHtml = '';
        stats.matches.forEach(match => {
            const isPlayer1 = match.player1 === playerName;
            const opponent = isPlayer1 ? match.player2 : match.player1;
            const resultClass = match.completed ? (match.winner === playerName ? 'win' : 'loss') : '';
            const resultText = match.completed ? (match.winner === playerName ? 'Victoire' : 'Défaite') : 'En cours';
            
            let setsScore = '';
            if (match.completed) {
                let playerSets = 0;
                let opponentSets = 0;
                
                match.sets.forEach(set => {
                    if (set.player1Score !== '' && set.player2Score !== '') {
                        const score1 = parseInt(set.player1Score);
                        const score2 = parseInt(set.player2Score);
                        
                        if ((isPlayer1 && score1 > score2) || (!isPlayer1 && score2 > score1)) {
                            playerSets++;
                        } else if (score1 !== score2) {
                            opponentSets++;
                        }
                    }
                });
                setsScore = `(${playerSets}-${opponentSets})`;
            }
            
            matchesHtml += `
                <div class="history-match ${resultClass}">
                    <div>
                        <div class="history-opponent">VS ${opponent}</div>
                        <div style="font-size: 12px; color: #7f8c8d;">Tour ${match.tour}</div>
                    </div>
                    <div class="history-score">
                        ${resultText} ${setsScore}
                    </div>
                </div>
            `;
        });
        
        const playerMatches = document.getElementById('playerMatches');
        if (playerMatches) {
            playerMatches.innerHTML = matchesHtml || '<p style="text-align: center; color: #7f8c8d;">Aucun match joué</p>';
        }
        
        const playerModal = document.getElementById('playerModal');
        if (playerModal) {
            playerModal.style.display = 'block';
        }
    }
    window.showPlayerDetails = showPlayerDetails;

    function closePlayerModal() {
        const playerModal = document.getElementById('playerModal');
        if (playerModal) {
            playerModal.style.display = 'none';
        }
    }
    window.closePlayerModal = closePlayerModal;

    function updateRankings() {
        const targetDay = parseInt(document.getElementById('targetDay').value);
        updateRankingsForDay(targetDay);
    }
    window.updateRankings = updateRankings;

    function updateStats(dayNumber) {
        const dayData = championship.days[dayNumber];
        if (!dayData) return;
        
        let totalPlayers = 0;
        let totalMatches = 0;
        let completedMatches = 0;
        
        for (let division = 1; division <= 3; division++) {
            totalPlayers += dayData.players[division].length;
            totalMatches += dayData.matches[division].length;
            
            dayData.matches[division].forEach((match, index) => {
                checkMatchCompletion(dayNumber, division, index);
                if (match.completed) completedMatches++;
            });
        }
        
        const statsDiv = document.getElementById(`stats-${dayNumber}`);
        const statsContent = document.getElementById(`statsContent-${dayNumber}`);
        
        if (!statsDiv || !statsContent) return;
        
        if (totalMatches > 0) {
            statsDiv.style.display = 'block';
            const completionRate = Math.round((completedMatches / totalMatches) * 100);
            
            let tourStats = '';
            for (let tour = 1; tour <= 4; tour++) {
                let tourTotal = 0;
                let tourCompleted = 0;
                
                for (let division = 1; division <= 3; division++) {
                    const tourMatches = dayData.matches[division].filter(m => m.tour === tour);
                    tourTotal += tourMatches.length;
                    tourCompleted += tourMatches.filter(m => m.completed).length;
                }
                
                if (tourTotal > 0) {
                    const tourRate = Math.round((tourCompleted / tourTotal) * 100);
                    tourStats += `
                        <div class="stat-card">
                            <div class="stat-number">${tourRate}%</div>
                            <div>Tour ${tour} (${tourCompleted}/${tourTotal})</div>
                        </div>
                    `;
                }
            }
            
            statsContent.innerHTML = `
                <div class="stat-card">
                    <div class="stat-number">${totalPlayers}</div>
                    <div>Joueurs inscrits</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${totalMatches}</div>
                    <div>Matchs générés</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${completedMatches}</div>
                    <div>Matchs terminés</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${completionRate}%</div>
                    <div>Progression</div>
                </div>
                ${tourStats}
            `;
        } else {
            statsDiv.style.display = 'none';
        }
    }

    function showRankings(type) {
        showRankingsForDay(championship.currentDay, type);
    }
    window.showRankings = showRankings;

    function showRankingsForDay(dayNumber, type) {
        const rankingsSection = document.getElementById(`rankings-${dayNumber}`);
        if (!rankingsSection) return;
        
        document.querySelectorAll(`#rankings-${dayNumber} .toggle-btn`).forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        updateRankingsForDay(dayNumber, type);
    }
    window.showRankingsForDay = showRankingsForDay;

    function updateRankingsForDay(dayNumber, sortBy = 'points') {
        const dayData = championship.days[dayNumber];
        if (!dayData) return;
        
        let rankingsHtml = '';
        let hasAnyMatches = false;
        
        for (let division = 1; division <= 3; division++) {
            if (dayData.matches[division].some(match => {
                checkMatchCompletion(dayNumber, division, dayData.matches[division].indexOf(match));
                return match.completed;
            })) {
                hasAnyMatches = true;
                break;
            }
        }
        
        if (!hasAnyMatches) {
            alert(`Aucun match terminé dans la Journée ${dayNumber} pour établir un classement !`);
            return;
        }
        
        for (let division = 1; division <= 3; division++) {
            if (dayData.players[division].length === 0) continue;
            
           const playerStats = dayData.players[division]
    .filter(player => player && player.toUpperCase() !== 'BYE')
    .map(player => {
        const stats = calculatePlayerStats(dayNumber, division, player);
        return {
            name: player,
            ...stats
        };
    });

if (sortBy === 'points') {
    // Tri standard tennis de table par points
    playerStats.sort((a, b) => {
        // 1. Points totaux
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;

        // 2. Différence de sets
        if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;

        // 3. Différence de points
        if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;

        // 4. Nombre de victoires
        if (b.wins !== a.wins) return b.wins - a.wins;

        // 5. Ordre alphabétique
        return a.name.localeCompare(b.name);
    });
} else {
    // Tri par % victoires
    playerStats.sort((a, b) => {
        // 1. % de victoires
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;

        // 2. Nombre de matchs joués (favorise qui a joué plus)
        if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;

        // 3. Différence de sets
        if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;

        // 4. Différence de points
        if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;

        // 5. Ordre alphabétique
        return a.name.localeCompare(b.name);
    });
}

            rankingsHtml += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #2c3e50; margin-bottom: 15px;">
                        ${division === 1 ? '🥇' : division === 2 ? '🥈' : '🥉'} Division ${division}
                    </h3>
                    <table class="ranking-table">
                        <thead>
                            <tr>
                                <th>Rang</th>
                                <th>Joueur</th>
                                <th>Points</th>
                                <th>V/D</th>
                                <th>% Vict.</th>
                                <th>Sets (G/P)</th>
                                <th>Diff Sets</th>
                                <th>Diff Points</th>
                                <th>Matchs</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            playerStats.forEach((player, index) => {
                const rankClass = index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : '';
                
                rankingsHtml += `
                    <tr style="cursor: pointer;" onclick="showPlayerDetails(${dayNumber}, ${division}, '${player.name}')">
                        <td class="rank-position ${rankClass}">${index + 1}</td>
                        <td style="font-weight: 600;">${player.name}</td>
                        <td class="stat-value">${player.totalPoints}</td>
                        <td>${player.wins}/${player.losses}</td>
                        <td>${player.winRate}%</td>
                        <td>${player.setsWon}/${player.setsLost}</td>
                        <td>${player.setsDiff > 0 ? '+' : ''}${player.setsDiff}</td>
                        <td>${player.pointsDiff > 0 ? '+' : ''}${player.pointsDiff}</td>
                        <td>${player.matchesPlayed}</td>
                    </tr>
                `;
            });
            
            rankingsHtml += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        const rankingsContentEl = document.getElementById(`rankingsContent-${dayNumber}`);
        const rankingsEl = document.getElementById(`rankings-${dayNumber}`);
        
        if (rankingsContentEl && rankingsEl) {
            rankingsContentEl.innerHTML = rankingsHtml;
            rankingsEl.style.display = 'block';
            rankingsEl.scrollIntoView({ behavior: 'smooth' });
        }
    }
    window.updateRankingsForDay = updateRankingsForDay;

    // CLASSEMENT GÉNÉRAL
    function updateGeneralRanking() {
        const generalStats = calculateGeneralStats();
        
        const generalStatsEl = document.getElementById('generalStats');
        if (generalStatsEl) {
            generalStatsEl.innerHTML = `
                <div class="general-stat-card">
                    <div class="general-stat-number">${generalStats.totalDays}</div>
                    <div class="general-stat-label">Journées</div>
                </div>
                <div class="general-stat-card">
                    <div class="general-stat-number">${generalStats.totalPlayers}</div>
                    <div class="general-stat-label">Joueurs uniques</div>
                </div>
                <div class="general-stat-card">
                    <div class="general-stat-number">${generalStats.totalMatches}</div>
                    <div class="general-stat-label">Matchs joués</div>
                </div>
                <div class="general-stat-card">
                    <div class="general-stat-number">${generalStats.completedMatches}</div>
                    <div class="general-stat-label">Matchs terminés</div>
                </div>
            `;
        }
        
        const generalRanking = calculateGeneralRanking();
        
        const generalRankingContent = document.getElementById('generalRankingContent');
        if (!generalRankingContent) return;
        
        if (!generalRanking.hasData) {
            generalRankingContent.innerHTML = `
                <div class="empty-state">
                    Terminez au moins un match dans une journée pour voir le classement général
                </div>
            `;
            return;
        }
        
        // Détection des doublons potentiels pour mise en évidence
        const similarPlayers = findSimilarPlayers();
        const duplicateNames = new Set();
        for (let d = 1; d <= 3; d++) {
            similarPlayers[d].forEach(p => {
                duplicateNames.add(p.name1);
                duplicateNames.add(p.name2);
            });
        }
        
        let rankingHtml = '';
        
        for (let division = 1; division <= 3; division++) {
            if (generalRanking.divisions[division].length === 0) continue;
            
            rankingHtml += `
    <div style="margin-bottom: 40px;">
        <h3 style="color: #e67e22; margin-bottom: 20px; font-size: 1.4rem;">
            ${division === 1 ? '🥇' : division === 2 ? '🥈' : '🥉'} Division ${division} - Classement Général
        </h3>
        <table class="ranking-table">
            <thead>
                <tr>
                    <th>Rang</th>
                    <th>Joueur</th>
                    <th>Points Total</th>
                    <th>Journées</th>
                    <th>V/D/F</th>
                    <th>% Vict. Moy.</th>
                    <th>Sets (G/P)</th>
                    <th>GA Sets</th>
                    <th>GA Points</th>
                </tr>
            </thead>
            <tbody>
`;

generalRanking.divisions[division].forEach((player, index) => {
    const rankClass = index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : '';
    const gaSetStyle = player.totalSetsDiff > 0 ? 'color: #27ae60; font-weight: bold;' :
                      player.totalSetsDiff < 0 ? 'color: #e74c3c; font-weight: bold;' : '';
    const gaPointStyle = player.totalPointsDiff > 0 ? 'color: #27ae60;' :
                        player.totalPointsDiff < 0 ? 'color: #e74c3c;' : '';
    const isDuplicate = duplicateNames.has(player.name);
    const duplicateStyle = isDuplicate ? 'background-color: #fff3cd; color: #856404;' : '';
    const duplicateTitle = isDuplicate ? 'Doublon potentiel détecté (voir Vérifier les joueurs)' : '';

    rankingHtml += `
        <tr style="cursor: pointer;" onclick="showGeneralPlayerDetails('${player.name.replace(/'/g, "\\'")}', ${division})">
            <td class="rank-position ${rankClass}">${index + 1}</td>
            <td style="font-weight: 600; ${duplicateStyle}" title="${duplicateTitle}">${player.name}</td>
            <td class="stat-value">${player.totalPoints}</td>
            <td>${player.daysPlayed}</td>
            <td>${player.totalWins}/${player.totalLosses}/${player.totalForfaits}</td>
            <td>${player.avgWinRate}%</td>
            <td>${player.totalSetsWon}/${player.totalSetsLost}</td>
            <td style="${gaSetStyle}">${player.totalSetsDiff > 0 ? '+' : ''}${player.totalSetsDiff}</td>
            <td style="${gaPointStyle}">${player.totalPointsDiff > 0 ? '+' : ''}${player.totalPointsDiff}</td>
        </tr>
    `;
});
            
            rankingHtml += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        generalRankingContent.innerHTML = rankingHtml;
        showNotification('Classement général mis à jour !', 'success');
    }
    window.updateGeneralRanking = updateGeneralRanking;

    function calculateGeneralStats() {
        let totalPlayers = new Set();
        let totalMatches = 0;
        let completedMatches = 0;
        let totalDays = Object.keys(championship.days).length;
        
        Object.values(championship.days).forEach(day => {
            Object.values(day.players).forEach(divPlayers => {
                divPlayers.filter(p => p && p.toUpperCase() !== 'BYE').forEach(player => totalPlayers.add(player));
            });
            Object.values(day.matches).forEach(divMatches => {
                totalMatches += divMatches.length;
                completedMatches += divMatches.filter(match => match.completed).length;
            });
        });
        
        return {
            totalDays,
            totalPlayers: totalPlayers.size,
            totalMatches,
            completedMatches
        };
    }

    function calculateGeneralRanking() {
        const generalRanking = {
            hasData: false,
            divisions: { 1: [], 2: [], 3: [] }
        };
        
        for (let division = 1; division <= 3; division++) {
            const playersData = {};
            
            Object.keys(championship.days).forEach(dayNumber => {
                const dayNum = parseInt(dayNumber);
                const dayData = championship.days[dayNum];
                
                dayData.players[division].forEach(playerName => {
                    if (playerName && playerName.toUpperCase() === 'BYE') return;
                    if (!playersData[playerName]) {
                        playersData[playerName] = {
                            name: playerName,
                            daysPlayed: 0,
                            totalPoints: 0,
                            totalWins: 0,
                            totalLosses: 0,
                            totalForfaits: 0,
                            totalSetsWon: 0,
                            totalSetsLost: 0,
                            totalPointsWon: 0,
                            totalPointsLost: 0,
                            totalMatchesPlayed: 0,
                            winRates: []
                        };
                    }
                    
                    const dayStats = calculatePlayerStats(dayNum, division, playerName);
                    if (dayStats && dayStats.matchesPlayed > 0) {
                        playersData[playerName].daysPlayed++;
                        playersData[playerName].totalPoints += dayStats.totalPoints;
                        playersData[playerName].totalWins += dayStats.wins;
                        playersData[playerName].totalLosses += dayStats.losses;
                        playersData[playerName].totalForfaits += dayStats.forfaits;
                        playersData[playerName].totalSetsWon += dayStats.setsWon;
                        playersData[playerName].totalSetsLost += dayStats.setsLost;
                        playersData[playerName].totalPointsWon += dayStats.pointsWon;
                        playersData[playerName].totalPointsLost += dayStats.pointsLost;
                        playersData[playerName].totalMatchesPlayed += dayStats.matchesPlayed;
                        playersData[playerName].winRates.push(dayStats.winRate);

                        generalRanking.hasData = true;
                    }
                });
            });
            
            const playersArray = Object.values(playersData)
                .filter(player => player.daysPlayed > 0)
                .map(player => ({
                    ...player,
                    avgWinRate: player.winRates.length > 0 ?
                        Math.round(player.winRates.reduce((a, b) => a + b, 0) / player.winRates.length) : 0,
                    totalSetsDiff: player.totalSetsWon - player.totalSetsLost,
                    totalPointsDiff: player.totalPointsWon - player.totalPointsLost
                }))
                .sort((a, b) => {
                    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
                    if (b.totalSetsDiff !== a.totalSetsDiff) return b.totalSetsDiff - a.totalSetsDiff;
                    if (b.totalPointsDiff !== a.totalPointsDiff) return b.totalPointsDiff - a.totalPointsDiff;
                    return b.avgWinRate - a.avgWinRate;
                });

            generalRanking.divisions[division] = playersArray;
        }
        
        return generalRanking;
    }

    function showGeneralPlayerDetails(playerName, division) {
        const playerHistory = [];
        
        Object.keys(championship.days).sort((a, b) => Number(a) - Number(b)).forEach(dayNumber => {
            const dayNum = parseInt(dayNumber);
            const dayData = championship.days[dayNum];
            
            if (dayData.players[division].includes(playerName)) {
                const dayStats = calculatePlayerStats(dayNum, division, playerName);
                if (dayStats && dayStats.matchesPlayed > 0) {
                    playerHistory.push({
                        day: dayNum,
                        ...dayStats
                    });
                }
            }
        });
        
        if (playerHistory.length === 0) {
            alert('Aucun match joué par ce joueur');
            return;
        }
        
        const totals = playerHistory.reduce((acc, day) => ({
            totalPoints: acc.totalPoints + day.totalPoints,
            totalWins: acc.totalWins + day.wins,
            totalLosses: acc.totalLosses + day.losses,
            totalForfaits: acc.totalForfaits + day.forfaits,
            totalSetsWon: acc.totalSetsWon + day.setsWon,
            totalSetsLost: acc.totalSetsLost + day.setsLost,
            totalMatchesPlayed: acc.totalMatchesPlayed + day.matchesPlayed
        }), {
            totalPoints: 0,
            totalWins: 0,
            totalLosses: 0,
            totalForfaits: 0,
            totalSetsWon: 0,
            totalSetsLost: 0,
            totalMatchesPlayed: 0
        });
        
        const avgWinRate = totals.totalMatchesPlayed > 0 ? 
            Math.round((totals.totalWins / totals.totalMatchesPlayed) * 100) : 0;
        
        const playerNameTitle = document.getElementById('playerNameTitle');
        if (playerNameTitle) {
            playerNameTitle.textContent = `${playerName} - Division ${division} - Vue Générale`;
        }
        
        const playerOverview = document.getElementById('playerOverview');
        if (playerOverview) {
            playerOverview.innerHTML = `
                <div class="overview-card">
                    <div class="overview-number">${playerHistory.length}</div>
                    <div class="overview-label">Journées jouées</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${totals.totalPoints}</div>
                    <div class="overview-label">Points total</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${totals.totalWins}/${totals.totalLosses}/${totals.totalForfaits}</div>
                    <div class="overview-label">V/D/F Global</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${avgWinRate}%</div>
                    <div class="overview-label">% Victoires</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${totals.totalSetsWon}/${totals.totalSetsLost}</div>
                    <div class="overview-label">Sets Global</div>
                </div>
                <div class="overview-card">
                    <div class="overview-number">${totals.totalMatchesPlayed}</div>
                    <div class="overview-label">Matchs total</div>
                </div>
            `;
        }
        
        let historyHtml = '<h4 style="color: #2c3e50; margin-bottom: 15px;">📈 Performance par journée</h4>';
        playerHistory.forEach(dayStats => {
            const performanceClass = dayStats.winRate >= 60 ? 'win' : dayStats.winRate >= 40 ? '' : 'loss';
            
            historyHtml += `
                <div class="history-match ${performanceClass}">
                    <div>
                        <div class="history-opponent">Journée ${dayStats.day}</div>
                        <div style="font-size: 12px; color: #7f8c8d;">
                            ${dayStats.wins}V/${dayStats.losses}D/${dayStats.forfaits}F - ${dayStats.matchesPlayed} matchs
                        </div>
                    </div>
                    <div class="history-score">
                        <div style="font-weight: bold;">${dayStats.totalPoints} pts</div>
                        <div style="font-size: 12px;">${dayStats.winRate}% vict.</div>
                    </div>
                </div>
            `;
        });
        
        const playerMatches = document.getElementById('playerMatches');
        if (playerMatches) {
            playerMatches.innerHTML = historyHtml;
        }
        
        const playerModal = document.getElementById('playerModal');
        if (playerModal) {
            playerModal.style.display = 'block';
        }
    }
    window.showGeneralPlayerDetails = showGeneralPlayerDetails;

    function exportGeneralRanking() {
        const generalRanking = calculateGeneralRanking();
        const generalStats = calculateGeneralStats();
        
        const exportData = {
            version: "2.0",
            exportDate: new Date().toISOString(),
            exportType: "general_ranking",
            championshipStats: generalStats,
            rankings: generalRanking.divisions,
            summary: {
                totalDaysInChampionship: Object.keys(championship.days).length,
                rankedDivisions: Object.keys(generalRanking.divisions).filter(div => 
                    generalRanking.divisions[div].length > 0
                ).length
            }
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `classement_general_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Classement général exporté !', 'success');
    }

      
    
   function exportGeneralRankingToPDF() {
    console.log("Début de la fonction exportGeneralRankingToPDF");

    const generalRanking = calculateGeneralRanking();
    console.log("Classement général calculé:", generalRanking);

    const generalStats = calculateGeneralStats();
    console.log("Statistiques générales calculées:", generalStats);

    if (!generalRanking.hasData) {
        console.log("Aucun classement général disponible pour l'export PDF");
        alert('Aucun classement général disponible pour l\'export PDF');
        return;
    }

    // Créer le contenu HTML optimisé pour l'impression
    const currentDate = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    let htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Classement Général - Championnat Tennis de Table</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Arial', 'Helvetica', sans-serif;
                    font-size: 12px;
                    line-height: 1.5;
                    color: #2c3e50;
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    padding: 25px;
                }
                
                .container {
                    background: white;
                    border-radius: 15px;
                    padding: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    max-width: 1000px;
                    margin: 0 auto;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 10px;
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 12px;
                    position: relative;
                    overflow: hidden;
                }
                
                .header::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -50%;
                    width: 200%;
                    height: 200%;
                    background: repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 10px,
                        rgba(255,255,255,0.05) 10px,
                        rgba(255,255,255,0.05) 20px
                    );
                }
                
                .header h1 {
                    font-size: 28px;
                    margin-bottom: 12px;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                    position: relative;
                    z-index: 1;
                }
                
                .header .date {
                    font-size: 14px;
                    opacity: 0.9;
                    position: relative;
                    z-index: 1;
                }
                
                .stats-section {
                    background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
                    padding: 20px;
                    margin-bottom: 10px;
                    border-radius: 12px;
                    border: 2px solid #f39c12;
                    position: relative;
                }
                
                .stats-title {
                    font-size: 18px;
                    font-weight: bold;
                    color: #e67e22;
                    margin-bottom: 15px;
                    text-align: center;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                }
                
                .stat-item {
                    text-align: center;
                    padding: 15px;
                    background: rgba(255,255,255,0.9);
                    border-radius: 10px;
                    border: 2px solid #f39c12;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    transition: transform 0.3s ease;
                }
                
                .stat-item:hover {
                    transform: translateY(-2px);
                }
                
                .stat-number {
                    font-size: 24px;
                    font-weight: bold;
                    color: #d35400;
                    display: block;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                }
                
                .stat-label {
                    font-size: 11px;
                    color: #8e44ad;
                    margin-top: 8px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .division {
                    margin-bottom: 30px;
                    page-break-inside: avoid;
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                }
                
                .division-title {
                    font-size: 20px;
                    font-weight: bold;
                    color: white;
                    margin-bottom: 0;
                    padding: 15px;
                    text-align: center;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                    letter-spacing: 1px;
                }
                
                .division-1 .division-title {
                    background: linear-gradient(135deg, #e74c3c, #c0392b);
                }
                
                .division-2 .division-title {
                    background: linear-gradient(135deg, #f39c12, #e67e22);
                }
                
                .division-3 .division-title {
                    background: linear-gradient(135deg, #27ae60, #229954);
                }
                
                .ranking-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 0;
                    font-size: 12px;
                }
                
                .ranking-table th {
                    background: linear-gradient(135deg, #34495e, #2c3e50);
                    color: white;
                    padding: 15px 10px;
                    text-align: center;
                    font-weight: bold;
                    font-size: 11px;
                    border: 1px solid #2c3e50;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                }
                
                .ranking-table td {
                    padding: 12px 10px;
                    border: 1px solid #ecf0f1;
                    font-size: 12px;
                    text-align: center;
                }
                
                .ranking-table tr:nth-child(even) {
                    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                }
                
                .ranking-table tr:hover {
                    background: linear-gradient(135deg, #d1ecf1, #bee5eb);
                    transform: scale(1.01);
                    transition: all 0.2s ease;
                }
                
                .rank-position {
                    font-weight: bold;
                    width: 60px;
                    font-size: 14px;
                }
                
                .rank-gold {
                    background: linear-gradient(135deg, #ffd700, #ffed4e) !important;
                    color: #b8860b !important;
                    font-weight: bold;
                    box-shadow: inset 0 2px 4px rgba(184, 134, 11, 0.3);
                }
                
                .rank-silver {
                    background: linear-gradient(135deg, #c0c0c0, #a8a8a8) !important;
                    color: #666 !important;
                    font-weight: bold;
                    box-shadow: inset 0 2px 4px rgba(102, 102, 102, 0.3);
                }
                
                .rank-bronze {
                    background: linear-gradient(135deg, #cd7f32, #b8722c) !important;
                    color: #8b4513 !important;
                    font-weight: bold;
                    box-shadow: inset 0 2px 4px rgba(139, 69, 19, 0.3);
                }
                
                .player-name {
                    font-weight: 600;
                    color: #2c3e50;
                    text-align: left;
                    padding-left: 15px;
                    font-size: 13px;
                }
                
                .points-total {
                    font-weight: bold;
                    color: #e74c3c;
                    font-size: 14px;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                }
                
                .footer {
                    margin-top: 40px;
                    padding: 25px;
                    background: linear-gradient(135deg, #34495e, #2c3e50);
                    color: white;
                    text-align: center;
                    border-radius: 12px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                }
                
                .footer p {
                    margin-bottom: 8px;
                    font-size: 12px;
                }
                
                .footer p:first-child {
                    font-weight: bold;
                    font-size: 14px;
                    color: #3498db;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                }
                
                .export-info {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #3498db, #2980b9);
                    color: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 8px 20px rgba(52, 152, 219, 0.3);
                    z-index: 1000;
                    max-width: 320px;
                    border: 2px solid rgba(255,255,255,0.2);
                }
                
                .export-info h3 {
                    margin-bottom: 15px;
                    font-size: 16px;
                    text-align: center;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                }
                
                .export-info p {
                    font-size: 13px;
                    line-height: 1.4;
                    margin-bottom: 10px;
                }
                
                .export-info .shortcut {
                    background: rgba(255,255,255,0.25);
                    padding: 4px 8px;
                    border-radius: 5px;
                    font-weight: bold;
                    border: 1px solid rgba(255,255,255,0.3);
                }
                
                @media print {
                    .export-info {
                        display: none !important;
                    }
                    
                    body {
                        background: white !important;
                        padding: 8px;
                        font-size: 11px;
                    }
                    
                    .container {
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    
                    .header {
                        background: #2c3e50 !important;
                        color: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        border-radius: 0 !important;
                        margin-bottom: 12px;
                    }
                    
                    .header::before {
                        display: none !important;
                    }
                    
                    .stats-section {
                        background: #f8f9fa !important;
                        border: 2px solid #dee2e6 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        border-radius: 0 !important;
                        margin-bottom: 12px;
                    }
                    
                    .stat-item {
                        background: white !important;
                        border: 1px solid #dee2e6 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    .division {
                        page-break-inside: avoid;
                        margin-bottom: 25px;
                        box-shadow: none !important;
                        border: 1px solid #dee2e6 !important;
                        border-radius: 0 !important;
                    }
                    
                    .division-title {
                        background: #f8f9fa !important;
                        color: #2c3e50 !important;
                        border: 2px solid #dee2e6 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    .division-1 .division-title {
                        background: #f8d7da !important;
                        color: #721c24 !important;
                        border-color: #e74c3c !important;
                    }
                    
                    .division-2 .division-title {
                        background: #fff3cd !important;
                        color: #856404 !important;
                        border-color: #f39c12 !important;
                    }
                    
                    .division-3 .division-title {
                        background: #d1ecf1 !important;
                        color: #155724 !important;
                        border-color: #27ae60 !important;
                    }
                    
                    .ranking-table {
                        page-break-inside: avoid;
                        font-size: 10px;
                    }
                    
                    .ranking-table th {
                        background: #2c3e50 !important;
                        color: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    .rank-gold, .rank-silver, .rank-bronze {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    .header h1 {
                        font-size: 22px;
                    }
                    
                    .stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 10px;
                    }
                    
                    .footer {
                        background: #34495e !important;
                        color: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        border-radius: 0 !important;
                        margin-top: 30px;
                    }
                }
                
                @page {
                    margin: 1cm;
                    size: A4 portrait;
                }
            </style>
        </head>
        <body>
            <div class="export-info">
                <h3>📄 Export PDF</h3>
                <p>Pour sauvegarder en PDF :</p>
                <p>• <span class="shortcut">Ctrl+P</span> (ou Cmd+P sur Mac)</p>
                <p>• Choisir "Enregistrer au format PDF"</p>
                <p>• Cliquer sur "Enregistrer"</p>
            </div>
            
            <div class="container">
                <div class="header">
                    <h1>🏆 CLASSEMENT GÉNÉRAL DU CHAMPIONNAT</h1>
                    <div class="date">Généré le ${currentDate}</div>
                </div>
                
                <div class="stats-section">
                    <div class="stats-title">📊 STATISTIQUES DU CHAMPIONNAT</div>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-number">${generalStats.totalDays}</span>
                            <div class="stat-label">Journées disputées</div>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${generalStats.totalPlayers}</span>
                            <div class="stat-label">Joueurs uniques</div>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${generalStats.totalMatches}</span>
                            <div class="stat-label">Matchs programmés</div>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${generalStats.completedMatches}</span>
                            <div class="stat-label">Matchs terminés</div>
                        </div>
                    </div>
                </div>
    `;

    // Ajouter les classements par division
    for (let division = 1; division <= 3; division++) {
        if (generalRanking.divisions[division].length === 0) continue;

        const divisionIcon = division === 1 ? '🥇' : division === 2 ? '🥈' : '🥉';
        const divisionName = `${divisionIcon} DIVISION ${division}`;
        
        htmlContent += `
            <div class="division division-${division}">
                <div class="division-title">${divisionName}</div>
                <table class="ranking-table">
                    <thead>
                        <tr>
                            <th>Rang</th>
                            <th>Joueur</th>
                            <th>Points</th>
                            <th>Journées</th>
                            <th>V/D/F</th>
                            <th>% Vict.</th>
                            <th>Sets G/P</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        generalRanking.divisions[division].forEach((player, index) => {
            let rankClass = '';
            if (index === 0) rankClass = 'rank-gold';
            else if (index === 1) rankClass = 'rank-silver';
            else if (index === 2) rankClass = 'rank-bronze';
            
            htmlContent += `
                <tr>
                    <td class="rank-position ${rankClass}">${index + 1}</td>
                    <td class="player-name">${player.name}</td>
                    <td class="points-total">${player.totalPoints}</td>
                    <td style="text-align: center;">${player.daysPlayed}</td>
                    <td style="text-align: center;">${player.totalWins}/${player.totalLosses}/${player.totalForfaits}</td>
                    <td style="text-align: center;">${player.avgWinRate}%</td>
                    <td style="text-align: center;">${player.totalSetsWon}/${player.totalSetsLost}</td>
                </tr>
            `;
        });

        htmlContent += `
                    </tbody>
                </table>
            </div>
        `;
    }

    // Ajouter le pied de page
    htmlContent += `
            <div class="footer">
                <p>Championnat Tennis de Table - Gestion Esenca Sport</p>
                <p>Système de points: Victoire = 3pts, Défaite = 1pt, Forfait = 3pts</p>
                <p>Document généré automatiquement le ${currentDate}</p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Ouvrir dans une nouvelle fenêtre
    const newWindow = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes,resizable=yes');
    
    if (!newWindow) {
        alert('Impossible d\'ouvrir une nouvelle fenêtre. Veuillez autoriser les pop-ups pour ce site.');
        return;
    }

    newWindow.document.write(htmlContent);
    newWindow.document.close();
    
    // Attendre que le contenu soit chargé puis proposer l'impression
    setTimeout(() => {
        newWindow.focus();
        
        // Afficher une alerte dans la nouvelle fenêtre
        const alertMessage = "✅ Page d'export créée avec succès !\n\n" +
                            "Pour enregistrer en PDF :\n" +
                            "1. Appuyez sur Ctrl+P (ou Cmd+P sur Mac)\n" +
                            "2. Choisissez 'Enregistrer au format PDF'\n" +
                            "3. Cliquez sur 'Enregistrer'\n\n" +
                            "Voulez-vous ouvrir la boîte de dialogue d'impression maintenant ?";
        
        if (newWindow.confirm(alertMessage)) {
            newWindow.print();
        }
    }, 500);

    console.log("Page d'export PDF créée avec succès");
    showNotification('Page d\'export PDF ouverte dans un nouvel onglet !', 'success');
}

// Assigner la fonction à l'objet window pour qu'elle soit accessible globalement
window.exportGeneralRankingToPDF = exportGeneralRankingToPDF;

    // EXPORT / IMPORT
    function exportChampionship() {
        const championshipData = {
            version: "2.0",
            exportDate: new Date().toISOString(),
            championshipName: `Championnat_${new Date().toISOString().slice(0,10)}`,
            championship: championship,
            stats: calculateChampionshipStats()
        };

        const dataStr = JSON.stringify(championshipData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `championnat_tennis_table_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Championnat exporté avec succès !', 'success');
    }
    window.exportChampionship = exportChampionship;

    function calculateChampionshipStats() {
        let totalPlayers = new Set();
        let totalMatches = 0;
        let totalDays = Object.keys(championship.days).length;
        
        Object.values(championship.days).forEach(day => {
            Object.values(day.players).forEach(divPlayers => {
                divPlayers.forEach(player => totalPlayers.add(player));
            });
            Object.values(day.matches).forEach(divMatches => {
                totalMatches += divMatches.length;
            });
        });
        
        return {
            totalPlayers: totalPlayers.size,
            totalMatches,
            totalDays,
            uniquePlayersList: Array.from(totalPlayers)
        };
    }

    function showImportModal() {
        const modal = document.getElementById('importModal');
        if (modal) {
            modal.style.display = 'block';
            const fileInput = document.getElementById('importFileInput');
            if (fileInput) fileInput.value = '';
        }
    }
    window.showImportModal = showImportModal;

    function closeImportModal() {
        const modal = document.getElementById('importModal');
        if (modal) {
            modal.style.display = 'none';
            const fileInput = document.getElementById('importFileInput');
            if (fileInput) fileInput.value = '';
            importedChampionshipData = null;
        }
    }
    window.closeImportModal = closeImportModal;

    function handleChampionshipImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.championship) {
                    importedChampionshipData = data;
                } else if (data.players && data.matches) {
                    importedChampionshipData = {
                        version: "2.0",
                        exportDate: data.timestamp || new Date().toISOString(),
                        championship: {
                            currentDay: 1,
                            days: {
                                1: {
                                    players: data.players,
                                    matches: data.matches
                                }
                            }
                        }
                    };
                } else {
                    throw new Error('Format de fichier non reconnu');
                }
                
                const importDate = new Date(importedChampionshipData.exportDate).toLocaleString('fr-FR');
                const stats = importedChampionshipData.stats || calculateStatsFromData(importedChampionshipData.championship);
                
                const confirmMsg = `Confirmer l'import du championnat ?\n\n` +
                                 `📅 Exporté le : ${importDate}\n` +
                                 `🏆 Journées : ${stats.totalDays || Object.keys(importedChampionshipData.championship.days).length}\n` +
                                 `👥 Joueurs : ${stats.totalPlayers || 'Non calculé'}\n` +
                                 `🎯 Matchs : ${stats.totalMatches || 'Non calculé'}\n\n` +
                                 `⚠️ Cette action remplacera complètement le championnat actuel`;
                
                if (confirm(confirmMsg)) {
                    processImport();
                } else {
                    closeImportModal();
                }
                
            } catch (error) {
                alert('Erreur lors de la lecture du fichier :\n' + error.message + '\n\nVérifiez que le fichier est un export valide.');
            }
        };
        
        reader.readAsText(file);
    }

    function calculateStatsFromData(championshipData) {
        let totalPlayers = new Set();
        let totalMatches = 0;
        
        Object.values(championshipData.days).forEach(day => {
            Object.values(day.players).forEach(divPlayers => {
                divPlayers.forEach(player => totalPlayers.add(player));
            });
            Object.values(day.matches).forEach(divMatches => {
                totalMatches += divMatches.length;
            });
        });
        
        return {
            totalPlayers: totalPlayers.size,
            totalMatches,
            totalDays: Object.keys(championshipData.days).length
        };
    }

    function processImport() {
        if (!importedChampionshipData) {
            alert('Aucun fichier sélectionné');
            return;
        }
        
        try {
            championship = importedChampionshipData.championship;
            
            if (!championship.days) {
                championship.days = {};
            }
            if (!championship.currentDay) {
                championship.currentDay = 1;
            }
            
            Object.keys(championship.days).forEach(dayNumber => {
                const day = championship.days[dayNumber];
                if (!day.players) day.players = { 1: [], 2: [], 3: [] };
                if (!day.matches) day.matches = { 1: [], 2: [], 3: [] };
                
                for (let division = 1; division <= 3; division++) {
                    if (!Array.isArray(day.players[division])) day.players[division] = [];
                    if (!Array.isArray(day.matches[division])) day.matches[division] = [];
                }
            });
            
            updateTabsDisplay();
            updateDaySelectors();
            initializeAllDaysContent();
            switchTab(championship.currentDay);
            saveToLocalStorage();
            
            closeImportModal();
            showNotification('Championnat importé avec succès !', 'success');
            
        } catch (error) {
            alert('Erreur lors de l\'import : ' + error.message);
        }
    }
    window.processImport = processImport;

    function clearAllData() {
        const stats = calculateChampionshipStats();
        const confirmMsg = `⚠️ ATTENTION ⚠️\n\n` +
                          `Cette action va SUPPRIMER DÉFINITIVEMENT :\n` +
                          `• ${stats.totalDays} journées\n` +
                          `• ${stats.totalPlayers} joueurs uniques\n` +
                          `• ${stats.totalMatches} matchs\n` +
                          `• Tous les scores et classements\n` +
                          `• Toutes les données en cache (localStorage)\n\n` +
                          `Cette action est IRRÉVERSIBLE !\n\n` +
                          `Êtes-vous vraiment sûr ?`;
        
        if (confirm(confirmMsg)) {
            const doubleConfirm = confirm('Dernière confirmation :\n\nSupprimer TOUT le championnat ET vider le cache ?');
            
            if (doubleConfirm) {
                // Réinitialiser les données en mémoire
                championship = {
                    currentDay: 1,
                    days: {
                        1: {
                            players: { 1: [], 2: [], 3: [] },
                            matches: { 1: [], 2: [], 3: [] },
                            locked: false
                        }
                    }
                };
                
                // NETTOYER COMPLÈTEMENT LE LOCALSTORAGE
                try {
                    // Supprimer la clé principale
                    localStorage.removeItem('tennisTableChampionship');
                    
                    // Supprimer toutes les clés liées au tennis de table (au cas où)
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && (key.includes('tennis') || key.includes('championship') || key.includes('tournoi'))) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(key => localStorage.removeItem(key));
                    
                    console.log("✅ LocalStorage complètement nettoyé");
                } catch (error) {
                    console.warn("⚠️ Erreur lors du nettoyage du localStorage:", error);
                }
                
                // Forcer le rechargement de l'interface
                try {
                    // Supprimer tous les onglets existants (sauf J1 et général)
                    const tabsContainer = document.getElementById('tabs');
                    if (tabsContainer) {
                        const tabsToRemove = tabsContainer.querySelectorAll('.tab:not(.general-ranking):not(.add-day-btn)');
                        tabsToRemove.forEach(tab => {
                            if (tab.dataset.day && parseInt(tab.dataset.day) > 1) {
                                tab.remove();
                            }
                        });
                    }
                    
                    // Supprimer tout le contenu des journées > 1
                    document.querySelectorAll('[id^="day-"]').forEach(dayContent => {
                        const dayId = dayContent.id.replace('day-', '');
                        if (parseInt(dayId) > 1) {
                            dayContent.remove();
                        }
                    });
                    
                } catch (error) {
                    console.warn("⚠️ Erreur lors du nettoyage de l'interface:", error);
                }
                
                // Réinitialiser complètement l'affichage
                updateTabsDisplay();
                updateDaySelectors();
                initializeDivisionsDisplay(1);
                updatePlayersDisplay(1);
                updateMatchesDisplay(1);
                updateStats(1);
                switchTab(1);
                
                // Cacher les classements
                const rankingsEl = document.getElementById('rankings-1');
                if (rankingsEl) rankingsEl.style.display = 'none';
                
                showNotification('Championnat complètement réinitialisé - Cache vidé !', 'success');
                
                // Option pour recharger la page complètement
                setTimeout(() => {
                    if (confirm('Voulez-vous recharger la page pour une remise à zéro complète ?')) {
                        location.reload();
                    }
                }, 2000);
            }
        }
    }
    window.clearAllData = clearAllData;

    window.clearAllData = clearAllData;

    // ======================================
    // GESTION DES MATCHS BYE MANUELS
    // ======================================

    function addByeMatchForPlayer(dayNumber, division, playerName) {
        console.log(`Ajout d'un match BYE pour ${playerName} en D${division}-J${dayNumber}`);
        
        const dayData = championship.days[dayNumber];
        if (!dayData) return;
        
        // Créer un match BYE (victoire automatique)
        const byeMatch = {
            player1: playerName,
            player2: "BYE",
            tour: 4, // Mettre au tour 4 par défaut
            sets: [
                { player1Score: 11, player2Score: 0 },
                { player1Score: 11, player2Score: 0 },
                { player1Score: '', player2Score: '' }
            ],
            completed: true,
            winner: playerName,
            isBye: true
        };
        
        dayData.matches[division].push(byeMatch);
        
        updateMatchesDisplay(dayNumber);
        updateStats(dayNumber);
        saveToLocalStorage();
        
        showNotification(`Match BYE ajouté pour ${playerName} en D${division}`, 'success');
    }
    window.addByeMatchForPlayer = addByeMatchForPlayer;

    function showByeManagementModal(dayNumber) {
        console.log(`Affichage modal gestion BYE pour J${dayNumber}`);
        
        const dayData = championship.days[dayNumber];
        if (!dayData) return;
        
        // Analyser qui a besoin de matchs BYE
        let playersNeedingBye = [];
        
        for (let division = 1; division <= 3; division++) {
            const players = dayData.players[division];
            
            players.forEach(player => {
                const playerMatches = dayData.matches[division].filter(m => 
                    m.player1 === player || m.player2 === player
                );
                
                const matchCount = playerMatches.length;
                
                if (matchCount < 4) {
                    playersNeedingBye.push({
                        name: player,
                        division: division,
                        currentMatches: matchCount,
                        missingMatches: 4 - matchCount
                    });
                }
            });
        }
        
        if (playersNeedingBye.length === 0) {
            alert('✅ Tous les joueurs ont 4 matchs !\n\nAucun match BYE nécessaire.');
            return;
        }
        
        // Créer le contenu du modal
        let modalHTML = `
            <div style="max-height: 400px; overflow-y: auto;">
                <p style="margin-bottom: 15px; color: #e67e22; font-weight: bold;">
                    ⚠️ ${playersNeedingBye.length} joueur(s) ont moins de 4 matchs
                </p>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #34495e; color: white;">
                            <th style="padding: 10px; text-align: left;">Joueur</th>
                            <th style="padding: 10px; text-align: center;">Div</th>
                            <th style="padding: 10px; text-align: center;">Matchs</th>
                            <th style="padding: 10px; text-align: center;">Manquants</th>
                            <th style="padding: 10px; text-align: center;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        playersNeedingBye.forEach((player, index) => {
            modalHTML += `
                <tr style="border-bottom: 1px solid #ddd; ${index % 2 === 0 ? 'background: #f8f9fa;' : ''}">
                    <td style="padding: 10px; font-weight: bold;">${player.name}</td>
                    <td style="padding: 10px; text-align: center;">D${player.division}</td>
                    <td style="padding: 10px; text-align: center;">${player.currentMatches}/4</td>
                    <td style="padding: 10px; text-align: center; color: #e74c3c; font-weight: bold;">
                        ${player.missingMatches}
                    </td>
                    <td style="padding: 10px; text-align: center;">
                        <button onclick="addByeMatchForPlayer(${dayNumber}, ${player.division}, '${player.name}'); closeByeModal();" 
                                style="
                            background: linear-gradient(135deg, #27ae60, #2ecc71);
                            color: white;
                            border: none;
                            padding: 8px 15px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: bold;
                        ">
                            + BYE
                        </button>
                    </td>
                </tr>
            `;
        });
        
        modalHTML += `
                    </tbody>
                </table>
                
                <div style="
                    margin-top: 20px;
                    padding: 15px;
                    background: #d5f4e6;
                    border-radius: 8px;
                    border-left: 4px solid #27ae60;
                ">
                    <strong>💡 Explication :</strong><br>
                    Un match BYE donne automatiquement 3 points (victoire) + 2 sets gagnés au joueur.<br>
                    Cela compense l'absence de 4ème adversaire avec un nombre impair de joueurs.
                </div>
            </div>
        `;
        
        // Afficher dans un modal custom
        const existingModal = document.getElementById('byeManagementModal');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'byeManagementModal';
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #2c3e50;">
                        🎯 Gestion des Matchs BYE - Journée ${dayNumber}
                    </h3>
                    <button onclick="closeByeModal()" class="close-modal">×</button>
                </div>
                ${modalHTML}
                <div class="modal-buttons" style="margin-top: 20px;">
                    <button onclick="addByeToAll(${dayNumber}); closeByeModal();" class="btn btn-success">
                        ✅ Ajouter BYE à TOUS
                    </button>
                    <button onclick="closeByeModal()" class="btn" style="background: #95a5a6;">
                        Fermer
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Fermer en cliquant en dehors
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeByeModal();
            }
        });
    }
    window.showByeManagementModal = showByeManagementModal;

    function closeByeModal() {
        const modal = document.getElementById('byeManagementModal');
        if (modal) modal.remove();
    }
    window.closeByeModal = closeByeModal;

    function addByeToAll(dayNumber) {
        console.log(`Ajout de BYE à tous les joueurs manquants pour J${dayNumber}`);
        
        const dayData = championship.days[dayNumber];
        if (!dayData) return;
        
        let addedCount = 0;
        
        for (let division = 1; division <= 3; division++) {
            const players = dayData.players[division];
            
            players.forEach(player => {
                const playerMatches = dayData.matches[division].filter(m => 
                    m.player1 === player || m.player2 === player
                );
                
                const matchCount = playerMatches.length;
                const missingMatches = 4 - matchCount;
                
                for (let i = 0; i < missingMatches; i++) {
                    addByeMatchForPlayer(dayNumber, division, player);
                    addedCount++;
                }
            });
        }
        
        showNotification(`${addedCount} matchs BYE ajoutés automatiquement !`, 'success');
    }
    window.addByeToAll = addByeToAll;
    // ÉVÉNEMENTS
    function setupEventListeners() {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.addEventListener('change', handleFileImport);
        
        const importFileInput = document.getElementById('importFileInput');
        if (importFileInput) importFileInput.addEventListener('change', handleChampionshipImport);
        
        ['bulkModal', 'importModal'].forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.addEventListener('click', function(event) {
                    if (event.target === this) {
                        this.style.display = 'none';
                    }
                });
            }
        });

        const playerModal = document.getElementById('playerModal');
        if (playerModal) {
            playerModal.addEventListener('click', function(event) {
                if (event.target === this) {
                    closePlayerModal();
                }
            });
        }

        // Gestion des nouveaux modals d'édition et suppression
        const editPlayerModal = document.getElementById('editPlayerModal');
        if (editPlayerModal) {
            editPlayerModal.addEventListener('click', function(event) {
                if (event.target === this) {
                    closeEditPlayerModal();
                }
            });
        }

        const deletePlayerModal = document.getElementById('deletePlayerModal');
        if (deletePlayerModal) {
            deletePlayerModal.addEventListener('click', function(event) {
                if (event.target === this) {
                    closeDeletePlayerModal();
                }
            });
        }

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeBulkModal();
                closePlayerModal();
                closeImportModal();
                closeEditPlayerModal();
                closeDeletePlayerModal();
            }
        });
        
        const playerNameInput = document.getElementById('playerName');
        if (playerNameInput) {
            playerNameInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    addPlayer();
                }
            });
        }

        // Event listener pour le champ d'édition de joueur
        const newPlayerNameInput = document.getElementById('newPlayerName');
        if (newPlayerNameInput) {
            newPlayerNameInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmEditPlayer();
                }
            });
        }
    }
function exportGeneralRankingToHTML() {
    console.log("Début de la fonction exportGeneralRankingToHTML");

    const generalRanking = calculateGeneralRanking();
    console.log("Classement général calculé:", generalRanking);

    const generalStats = calculateGeneralStats();
    console.log("Statistiques générales calculées:", generalStats);

    if (!generalRanking.hasData) {
        console.log("Aucun classement général disponible pour l'export HTML");
        alert('Aucun classement général disponible pour l\'export HTML');
        return;
    }

    // Créer le contenu HTML
    let htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Classement Général du Championnat</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                }
                .container {
                    max-width: 1400px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    overflow: hidden;
                }
                .header {
                    background: linear-gradient(135deg, #2c3e50, #34495e);
                    color: white;
                    padding: 25px;
                    text-align: center;
                }
                .header h1 {
                    font-size: 2.5rem;
                    margin-bottom: 10px;
                }
                .section {
                    margin-bottom: 40px;
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 25px;
                    border-left: 5px solid #3498db;
                }
                .section h2 {
                    color: #2c3e50;
                    margin-bottom: 20px;
                    font-size: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .stat-card {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    text-align: center;
                    border-left: 4px solid #f39c12;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.1);
                }
                .stat-number {
                    font-size: 2.5rem;
                    font-weight: bold;
                    color: #f39c12;
                    margin-bottom: 5px;
                }
                .stat-label {
                    color: #7f8c8d;
                    font-weight: 500;
                }
                .division {
                    background: white;
                    border-radius: 12px;
                    padding: 25px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                    border-top: 4px solid;
                    margin-bottom: 20px;
                }
                .division-1 { border-top-color: #e74c3c; }
                .division-2 { border-top-color: #f39c12; }
                .division-3 { border-top-color: #27ae60; }
                .division h3 {
                    margin-bottom: 20px;
                    font-size: 1.3rem;
                    text-align: center;
                }
                .ranking-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                }
                .ranking-table th, .ranking-table td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #ecf0f1;
                }
                .ranking-table th {
                    background: #f8f9fa;
                    font-weight: 600;
                    color: #2c3e50;
                }
                .ranking-table tr:hover {
                    background: #f8f9fa;
                }
                .rank-position {
                    font-weight: bold;
                    color: #3498db;
                    width: 50px;
                }
                .rank-gold { color: #f39c12; }
                .rank-silver { color: #95a5a6; }
                .rank-bronze { color: #e67e22; }
                .footer {
                    text-align: center;
                    padding: 20px;
                    color: #7f8c8d;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏆 CLASSEMENT GÉNÉRAL DU CHAMPIONNAT</h1>
                    <p>Généré le ${new Date().toLocaleDateString('fr-FR', {
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    })}</p>
                </div>
                <div class="section">
                    <h2>📊 STATISTIQUES DU CHAMPIONNAT</h2>
                    <div class="stats">
                        <div class="stat-card">
                            <div class="stat-number">${generalStats.totalDays}</div>
                            <div class="stat-label">Journées disputées</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${generalStats.totalPlayers}</div>
                            <div class="stat-label">Joueurs uniques</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${generalStats.totalMatches}</div>
                            <div class="stat-label">Matchs programmés</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${generalStats.completedMatches}</div>
                            <div class="stat-label">Matchs terminés</div>
                        </div>
                    </div>
                </div>
    `;

    // Ajouter les classements par division
    for (let division = 1; division <= 3; division++) {
        if (generalRanking.divisions[division].length === 0) continue;

        const divisionIcon = division === 1 ? '🥇' : division === 2 ? '🥈' : '🥉';
        htmlContent += `
            <div class="division division-${division}">
                <h3>${divisionIcon} DIVISION ${division}</h3>
                <table class="ranking-table">
                    <thead>
                        <tr>
                            <th>Rang</th>
                            <th>Joueur</th>
                            <th>Points</th>
                            <th>Journées</th>
                            <th>V/D/F</th>
                            <th>% Vict.</th>
                            <th>Sets</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        generalRanking.divisions[division].forEach((player, index) => {
            const rankClass = index < 3 ? `rank-${index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze'}` : '';
            htmlContent += `
                <tr>
                    <td class="rank-position ${rankClass}">${index + 1}</td>
                    <td>${player.name}</td>
                    <td>${player.totalPoints}</td>
                    <td>${player.daysPlayed}</td>
                    <td>${player.totalWins}/${player.totalLosses}/${player.totalForfaits}</td>
                    <td>${player.avgWinRate}%</td>
                    <td>${player.totalSetsWon}/${player.totalSetsLost}</td>
                </tr>
            `;
        });

        htmlContent += `
                    </tbody>
                </table>
            </div>
        `;
    }

    // Ajouter le pied de page
    htmlContent += `
                <div class="footer">
                    <p>Championnat Tennis de Table - Gestion Esenca Sport</p>
                    <p>Système de points: Victoire = 3pts, Défaite = 1pt, Forfait = 3pts</p>
                </div>
            </div>
        </body>
        </html>
    `;

    // Créer un blob et une URL pour le téléchargement
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Créer un lien de téléchargement
    const a = document.createElement('a');
    a.href = url;
    a.download = `Classement_General_${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(a);
    a.click();

    // Nettoyer
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('Classement général exporté en HTML !', 'success');
    console.log("Fin de la fonction exportGeneralRankingToHTML");
}

window.exportGeneralRanking = exportGeneralRanking;
window.exportGeneralRankingToPDF = exportGeneralRankingToPDF;
window.exportGeneralRankingToHTML = exportGeneralRankingToHTML;
    // INITIALISATION AU CHARGEMENT
    document.addEventListener('DOMContentLoaded', function() {
        console.log("DOM chargé, début initialisation");

        // Charger les données sauvegardées
        if (loadFromLocalStorage()) {
            updateTabsDisplay();
            updateDaySelectors();
            initializeAllDaysContent();
            switchTab(championship.currentDay);
            updateDayTabsBadges(); // Afficher les badges de verrouillage
        } else {
            initializeDivisionsDisplay(1);
            updatePlayersDisplay(1);
            initializePoolsForDay(1);
        }

        setupEventListeners();
        console.log("Initialisation terminée");
    });

    // ======================================
// SYSTÈME DE POULES OPTIONNEL - EXTENSION SÉCURISÉE
// ======================================

// Extension de la structure de données (non-breaking)
function initializePoolSystem(dayNumber) {
    const dayData = championship.days[dayNumber];
    
    // Ajouter la structure poules si elle n'existe pas
    if (!dayData.pools) {
        dayData.pools = {
            enabled: false,
            divisions: {
                1: { pools: [], matches: [] },
                2: { pools: [], matches: [] },
                3: { pools: [], matches: [] }
            }
        };
    }
    
    // Garantir la compatibilité avec l'ancien système
    if (!dayData.matches) {
        dayData.matches = { 1: [], 2: [], 3: [] };
    }
}

// ======================================
// INTERFACE UTILISATEUR - ACTIVATION POULES
// ======================================

function addPoolToggleToInterface(dayNumber) {
    const section = document.querySelector(`#day-${dayNumber} .section`);
    if (!section) return;
    
    // Créer le toggle poules après le bouton génération matchs
    const generateButton = section.querySelector('button[onclick*="generateMatchesForDay"]');
    if (!generateButton) return;
    
    const poolToggleHTML = `
        <div class="pool-toggle-section" id="pool-toggle-${dayNumber}" style="
            background: linear-gradient(135deg, #e8f4fd, #b3d9ff);
            border: 2px solid #3498db;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        ">
            <h3 style="color: #2980b9; margin-bottom: 15px;">
                🎯 Mode Poules de Qualification (Optionnel)
            </h3>
            <p style="color: #34495e; margin-bottom: 15px; font-size: 14px;">
                Les poules permettent de faire jouer tous les joueurs puis organiser des phases finales
            </p>
            
            <div class="toggle-container" style="margin-bottom: 15px;">
                <label class="toggle-switch" style="display: inline-flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" id="pool-enabled-${dayNumber}" onchange="togglePoolMode(${dayNumber})" style="
                        width: 20px; height: 20px; cursor: pointer;
                    ">
                    <span style="font-weight: bold; color: #2c3e50;">Activer le mode Poules</span>
                </label>
            </div>
            
            <div id="pool-config-${dayNumber}" class="pool-config" style="display: none;">
                <div style="display: flex; gap: 15px; justify-content: center; align-items: center; flex-wrap: wrap; margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 600; color: #2c3e50;">Taille des poules:</span>
                        <select id="pool-size-${dayNumber}" style="padding: 8px; border: 2px solid #3498db; border-radius: 6px;">
                            <option value="4">4 joueurs par poule</option>
                            <option value="5">5 joueurs par poule</option>
                            <option value="6">6 joueurs par poule</option>
                        </select>
                    </label>
                    
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 600; color: #2c3e50;">Qualifiés par poule:</span>
                        <select id="qualified-per-pool-${dayNumber}" style="padding: 8px; border: 2px solid #3498db; border-radius: 6px;">
                            <option value="2">2 premiers</option>
                            <option value="3">3 premiers</option>
                        </select>
                    </label>
                </div>
                
                <button class="btn" onclick="generatePools(${dayNumber})" style="
                    background: linear-gradient(135deg, #27ae60, #2ecc71);
                    color: white;
                    padding: 12px 25px;
                    margin-right: 10px;
                ">
                    🎯 Générer les Poules
                </button>
                
                <button class="btn" onclick="generateFinalPhase(${dayNumber})" style="
                    background: linear-gradient(135deg, #f39c12, #e67e22);
                    color: white;
                    padding: 12px 25px;
                " disabled id="final-phase-btn-${dayNumber}">
                    🏆 Générer Phase Finale
                </button>
            </div>
            
            <div class="pool-info" style="
                background: rgba(255, 255, 255, 0.8);
                padding: 15px;
                border-radius: 8px;
                margin-top: 15px;
                font-size: 13px;
                color: #2c3e50;
                display: none;
            " id="pool-info-${dayNumber}">
                <strong>ℹ️ Comment ça marche :</strong><br>
                1. Les joueurs sont répartis en poules équilibrées<br>
                2. Chaque poule joue en round-robin<br>
                3. Les meilleurs se qualifient pour les phases finales<br>
                4. Tableaux à élimination directe pour désigner les champions
            </div>
        </div>
    `;
    
    generateButton.insertAdjacentHTML('afterend', poolToggleHTML);
}

// ======================================
// FONCTIONS DE GESTION DES POULES
// ======================================

function togglePoolMode(dayNumber) {
    const checkbox = document.getElementById(`pool-enabled-${dayNumber}`);
    const config = document.getElementById(`pool-config-${dayNumber}`);
    const info = document.getElementById(`pool-info-${dayNumber}`);
    const generateButton = document.querySelector(`#day-${dayNumber} button[onclick*="generateMatchesForDay"]`);
    
    initializePoolSystem(dayNumber);
    
    if (checkbox.checked) {
        // Activer mode poules
        championship.days[dayNumber].pools.enabled = true;
        config.style.display = 'block';
        info.style.display = 'block';
        
        // Désactiver l'ancien bouton
        if (generateButton) {
            generateButton.style.opacity = '0.5';
            generateButton.style.pointerEvents = 'none';
            generateButton.innerHTML = '⚠️ Mode Poules Activé - Utilisez les boutons ci-dessus';
        }
        
        showNotification('Mode Poules activé ! Utilisez "Générer les Poules" ci-dessus', 'info');
    } else {
        // Désactiver mode poules - Revenir au mode classique
        championship.days[dayNumber].pools.enabled = false;
        config.style.display = 'none';
        info.style.display = 'none';
        
        // Réactiver l'ancien bouton
        if (generateButton) {
            generateButton.style.opacity = '1';
            generateButton.style.pointerEvents = 'auto';
            generateButton.innerHTML = '🎯 Générer les Matchs (Round-Robin)';
        }
        
        // Nettoyer les poules existantes mais préserver les matchs round-robin classiques
        championship.days[dayNumber].pools.divisions = {
            1: { pools: [], matches: [] },
            2: { pools: [], matches: [] },
            3: { pools: [], matches: [] }
        };
        
        showNotification('Mode Poules désactivé - Retour au mode classique', 'warning');
    }
    
    saveToLocalStorage();
}

function generatePools(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData.pools.enabled) return;
    
    const poolSize = parseInt(document.getElementById(`pool-size-${dayNumber}`).value);
    let totalMatches = 0;
    
    for (let division = 1; division <= 3; division++) {
        const players = [...dayData.players[division]];
        if (players.length < 4) {
            if (players.length > 0) {
                alert(`Division ${division}: Il faut au moins 4 joueurs pour créer des poules (${players.length} actuellement)`);
            }
            continue;
        }
        
        // Mélanger les joueurs pour équilibrer les poules
        const shuffledPlayers = shuffleArray([...players]);
        const pools = createBalancedPools(shuffledPlayers, poolSize);
        
        // Sauvegarder les poules
        dayData.pools.divisions[division].pools = pools;
        
        // Générer les matchs de poules
        const poolMatches = generatePoolMatches(pools, division, dayNumber);
        dayData.pools.divisions[division].matches = poolMatches;
        totalMatches += poolMatches.length;
        
        console.log(`Division ${division}: ${pools.length} poules créées avec ${poolMatches.length} matchs`);
    }
    
    // Mettre à jour l'affichage
    updatePoolsDisplay(dayNumber);
    saveToLocalStorage();
    
    // Activer le bouton phase finale quand toutes les poules sont terminées
    checkPoolsCompletion(dayNumber);
    
    alert(`Poules générées avec succès !\n${totalMatches} matchs de poules créés.\n\nTerminez les poules pour débloquer la phase finale.`);
}

function createBalancedPools(players, maxPoolSize) {
    const numPools = Math.ceil(players.length / maxPoolSize);
    const pools = Array.from({ length: numPools }, () => []);
    
    // Répartition équilibrée (serpent)
    players.forEach((player, index) => {
        const poolIndex = Math.floor(index / maxPoolSize);
        if (poolIndex < numPools) {
            pools[poolIndex].push(player);
        } else {
            // Si il reste des joueurs, les répartir dans les poules existantes
            const targetPool = index % numPools;
            pools[targetPool].push(player);
        }
    });
    
    // Filtrer les poules vides
    return pools.filter(pool => pool.length > 0);
}

function generatePoolMatches(pools, division, dayNumber) {
    const allMatches = [];
    let matchId = 0;
    
    pools.forEach((pool, poolIndex) => {
        for (let i = 0; i < pool.length; i++) {
            for (let j = i + 1; j < pool.length; j++) {
                allMatches.push({
                    id: matchId++,
                    player1: pool[i],
                    player2: pool[j],
                    poolIndex: poolIndex,
                    poolName: `Poule ${String.fromCharCode(65 + poolIndex)}`, // A, B, C...
                    division: division,
                    dayNumber: dayNumber,
                    sets: [
                        { player1Score: '', player2Score: '' },
                        { player1Score: '', player2Score: '' },
                        { player1Score: '', player2Score: '' }
                    ],
                    completed: false,
                    winner: null,
                    isPoolMatch: true
                });
            }
        }
    });
    
    return allMatches;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ======================================
// AFFICHAGE DES POULES
// ======================================

function updatePoolsDisplay(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData.pools.enabled) return;
    
    for (let division = 1; division <= 3; division++) {
        const container = document.getElementById(`division${dayNumber}-${division}-matches`);
        if (!container) continue;
        
        const pools = dayData.pools.divisions[division].pools;
        const matches = dayData.pools.divisions[division].matches;
        
        if (pools.length === 0) {
            container.innerHTML = '<div class="empty-state">Aucune poule générée</div>';
            continue;
        }
        
        let html = '<div class="pools-container">';
        
        pools.forEach((pool, poolIndex) => {
            const poolName = `Poule ${String.fromCharCode(65 + poolIndex)}`;
            const poolMatches = matches.filter(m => m.poolIndex === poolIndex);
            const completedMatches = poolMatches.filter(m => m.completed).length;
            
            html += `
                <div class="pool-section" style="
                    background: white;
                    border: 2px solid #3498db;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                ">
                    <div class="pool-header" style="
                        background: linear-gradient(135deg, #3498db, #2980b9);
                        color: white;
                        padding: 15px;
                        border-radius: 8px;
                        margin-bottom: 15px;
                        text-align: center;
                    ">
                        <h4 style="margin: 0; font-size: 1.2rem;">${poolName}</h4>
                        <div style="font-size: 14px; margin-top: 5px;">
                            ${completedMatches}/${poolMatches.length} matchs terminés
                        </div>
                    </div>
                    
                    <div class="pool-players" style="
                        display: flex;
                        flex-wrap: wrap;
                        gap: 10px;
                        justify-content: center;
                        margin-bottom: 15px;
                        padding: 15px;
                        background: #f8f9fa;
                        border-radius: 8px;
                    ">
                        ${pool.map(player => 
                            `<span class="pool-player-tag" style="
                                background: linear-gradient(135deg, #27ae60, #2ecc71);
                                color: white;
                                padding: 8px 15px;
                                border-radius: 20px;
                                font-weight: 500;
                                font-size: 14px;
                            ">${player}</span>`
                        ).join('')}
                    </div>
                    
                    <div class="pool-matches">
                        ${poolMatches.map(match => generatePoolMatchHTML(match, dayNumber)).join('')}
                    </div>
                    
                    ${completedMatches === poolMatches.length ? 
                        `<div class="pool-ranking" style="margin-top: 15px;">
                            ${generatePoolRankingHTML(pool, poolMatches, poolIndex)}
                        </div>` : ''}
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }
}

function generatePoolMatchHTML(match, dayNumber) {
    const matchStatus = match.completed ? 'completed' : 'pending';
    const statusClass = match.completed ? 'status-completed' : 'status-pending';
    const statusText = match.completed ? 'Terminé' : 'En cours';
    
    return `
        <div class="pool-match ${matchStatus}" style="
            background: ${match.completed ? '#d5f4e6' : '#fff'};
            border: 2px solid ${match.completed ? '#27ae60' : '#ecf0f1'};
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
        ">
            <div class="match-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            ">
                <div class="player-names" style="font-weight: 600; color: #2c3e50;">
                    ${match.player1} VS ${match.player2}
                </div>
                <div class="match-status ${statusClass}" style="
                    font-size: 12px;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-weight: bold;
                    background: ${match.completed ? '#a8e6cf' : '#ffeaa7'};
                    color: ${match.completed ? '#00b894' : '#d63031'};
                ">${statusText}</div>
            </div>
            
            <div class="sets-container" style="
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
                margin-bottom: 10px;
            ">
                ${match.sets.map((set, setIndex) => `
                    <div class="set" style="
                        background: #f8f9fa;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        padding: 10px;
                        text-align: center;
                    ">
                        <div style="font-size: 12px; color: #7f8c8d; margin-bottom: 5px; font-weight: bold;">
                            Set ${setIndex + 1}
                        </div>
                        <div style="display: flex; justify-content: center; align-items: center; gap: 5px;">
                            <input type="number" 
                                   value="${set.player1Score || ''}" 
                                   placeholder=""
                                   onchange="updatePoolMatchScore(${dayNumber}, '${match.id}', ${setIndex}, 'player1Score', this.value)"
                                   onkeydown="handlePoolMatchEnter(event, ${dayNumber}, '${match.id}')"
                                   style="width: 50px; height: 40px; text-align: center; padding: 8px; font-weight: bold; font-size: 16px; border: 2px solid #ddd; border-radius: 6px;">
                            <span style="font-weight: bold; color: #7f8c8d;">-</span>
                            <input type="number" 
                                   value="${set.player2Score || ''}" 
                                   placeholder=""
                                   onchange="updatePoolMatchScore(${dayNumber}, '${match.id}', ${setIndex}, 'player2Score', this.value)"
                                   onkeydown="handlePoolMatchEnter(event, ${dayNumber}, '${match.id}')"
                                   style="width: 50px; height: 40px; text-align: center; padding: 8px; font-weight: bold; font-size: 16px; border: 2px solid #ddd; border-radius: 6px;">
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="match-result" style="
                text-align: center;
                font-weight: bold;
                padding: 8px;
                border-radius: 6px;
                background: ${match.completed ? '#a8e6cf' : '#ffeaa7'};
                color: ${match.completed ? '#00b894' : '#d63031'};
            ">
                ${match.completed && match.winner ? 
                    `🏆 ${match.winner} remporte le match` : 
                    'En attente des résultats'}
            </div>
        </div>
    `;
}

// ======================================
// GESTION DES SCORES DE POULES
// ======================================

function updatePoolMatchScore(dayNumber, matchId, setIndex, scoreField, value) {
    const dayData = championship.days[dayNumber];
    
    for (let division = 1; division <= 3; division++) {
        const match = dayData.pools.divisions[division].matches.find(m => m.id == matchId);
        if (match) {
            match.sets[setIndex][scoreField] = value;
            checkPoolMatchCompletion(dayNumber, matchId);
            updatePoolsDisplay(dayNumber);
            saveToLocalStorage();
            break;
        }
    }
}

function handlePoolMatchEnter(event, dayNumber, matchId) {
    if (event.key === 'Enter') {
        checkPoolMatchCompletion(dayNumber, matchId);
        updatePoolsDisplay(dayNumber);
        checkPoolsCompletion(dayNumber);
        saveToLocalStorage();
    }
}

function checkPoolMatchCompletion(dayNumber, matchId) {
    const dayData = championship.days[dayNumber];
    
    for (let division = 1; division <= 3; division++) {
        const match = dayData.pools.divisions[division].matches.find(m => m.id == matchId);
        if (match) {
            let player1Sets = 0;
            let player2Sets = 0;
            
            match.sets.forEach(set => {
                if (set.player1Score !== '' && set.player2Score !== '') {
                    const score1 = parseInt(set.player1Score);
                    const score2 = parseInt(set.player2Score);
                    if (score1 > score2) player1Sets++;
                    else if (score2 > score1) player2Sets++;
                }
            });
            
            if (player1Sets >= 2) {
                match.completed = true;
                match.winner = match.player1;
            } else if (player2Sets >= 2) {
                match.completed = true;
                match.winner = match.player2;
            } else {
                match.completed = false;
                match.winner = null;
            }
            
            break;
        }
    }
}

function checkPoolsCompletion(dayNumber) {
    const dayData = championship.days[dayNumber];
    const finalButton = document.getElementById(`final-phase-btn-${dayNumber}`);
    
    let allPoolsCompleted = true;
    
    for (let division = 1; division <= 3; division++) {
        const matches = dayData.pools.divisions[division].matches;
        if (matches.length > 0 && !matches.every(match => match.completed)) {
            allPoolsCompleted = false;
            break;
        }
    }
    
    if (finalButton) {
        finalButton.disabled = !allPoolsCompleted;
        finalButton.style.opacity = allPoolsCompleted ? '1' : '0.5';
    }
    
    return allPoolsCompleted;
}

// ======================================
// CLASSEMENT DES POULES
// ======================================

function generatePoolRankingHTML(pool, poolMatches, poolIndex) {
    const playerStats = pool.map(player => {
        let wins = 0, losses = 0, setsWon = 0, setsLost = 0, pointsWon = 0, pointsLost = 0;
        
        poolMatches.forEach(match => {
            if (!match.completed) return;
            
            const isPlayer1 = match.player1 === player;
            const isPlayer2 = match.player2 === player;
            
            if (isPlayer1 || isPlayer2) {
                if (match.winner === player) wins++;
                else losses++;
                
                match.sets.forEach(set => {
                    if (set.player1Score !== '' && set.player2Score !== '') {
                        const score1 = parseInt(set.player1Score);
                        const score2 = parseInt(set.player2Score);
                        
                        if (isPlayer1) {
                            if (score1 > score2) setsWon++;
                            else if (score2 > score1) setsLost++;
                            pointsWon += score1;
                            pointsLost += score2;
                        } else {
                            if (score2 > score1) setsWon++;
                            else if (score1 > score2) setsLost++;
                            pointsWon += score2;
                            pointsLost += score1;
                        }
                    }
                });
            }
        });
        
        return {
            name: player,
            wins,
            losses,
            setsWon,
            setsLost,
            setsDiff: setsWon - setsLost,
            pointsWon,
            pointsLost,
            pointsDiff: pointsWon - pointsLost,
            points: wins * 3 + losses * 1
        };
    });

    // Trier par points puis par différence de sets puis par différence de points
    playerStats.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;
        return b.pointsDiff - a.pointsDiff;
    });
    
    return `
        <div style="
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border: 2px solid #28a745;
            border-radius: 8px;
            padding: 15px;
        ">
            <h5 style="text-align: center; color: #28a745; margin-bottom: 15px;">
                📊 Classement ${String.fromCharCode(65 + poolIndex)}
            </h5>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: #28a745; color: white;">
                        <th style="padding: 8px; text-align: left;">Rang</th>
                        <th style="padding: 8px; text-align: left;">Joueur</th>
                        <th style="padding: 8px; text-align: center;">Pts</th>
                        <th style="padding: 8px; text-align: center;">V/D</th>
                        <th style="padding: 8px; text-align: center;">Sets</th>
                    </tr>
                </thead>
                <tbody>
                    ${playerStats.map((player, index) => `
                        <tr style="
                            background: ${index < 2 ? '#d4edda' : 'white'};
                            border-bottom: 1px solid #dee2e6;
                        ">
                            <td style="padding: 8px; font-weight: bold; color: ${index < 2 ? '#155724' : '#333'};">
                                ${index + 1}${index < 2 ? ' 🎯' : ''}
                            </td>
                            <td style="padding: 8px; font-weight: 600;">${player.name}</td>
                            <td style="padding: 8px; text-align: center; font-weight: bold;">${player.points}</td>
                            <td style="padding: 8px; text-align: center;">${player.wins}/${player.losses}</td>
                            <td style="padding: 8px; text-align: center;">${player.setsWon}/${player.setsLost}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ======================================
// INTÉGRATION AVEC LE SYSTÈME EXISTANT
// ======================================

// Modifier la fonction de génération des matchs pour détecter le mode poules
function generateMatchesForDayWithPoolSupport(dayNumber) {
    if (!dayNumber) dayNumber = championship.currentDay;
    
    const dayData = championship.days[dayNumber];
    if (!dayData) return;
    
    // Vérifier si le mode poules est activé
    if (dayData.pools && dayData.pools.enabled) {
        alert('⚠️ Mode Poules activé !\n\nUtilisez les boutons "Générer les Poules" dans la section bleue ci-dessus.');
        return;
    }
    
    // Continuer avec la génération classique
    generateMatchesForDay(dayNumber);
}

// Hook d'initialisation pour chaque journée
function initializePoolsForDay(dayNumber) {
    // Ajouter l'interface poules si elle n'existe pas
    const existingToggle = document.getElementById(`pool-toggle-${dayNumber}`);
    if (!existingToggle) {
        addPoolToggleToInterface(dayNumber);
    }
    
    // Initialiser la structure de données
    initializePoolSystem(dayNumber);
    
    // Vérifier l'état du toggle si les poules sont activées
    const dayData = championship.days[dayNumber];
    if (dayData.pools && dayData.pools.enabled) {
        const checkbox = document.getElementById(`pool-enabled-${dayNumber}`);
        if (checkbox) {
            checkbox.checked = true;
            togglePoolMode(dayNumber); // Appliquer l'état
            updatePoolsDisplay(dayNumber);
        }
    }
}

// Export des fonctions principales
window.initializePoolsForDay = initializePoolsForDay;
window.togglePoolMode = togglePoolMode;
window.generatePools = generatePools;
window.updatePoolMatchScore = updatePoolMatchScore;
window.handlePoolMatchEnter = handlePoolMatchEnter;
window.generateFinalPhase = function(dayNumber) {
    alert('Phase finale en cours de développement...\nPour l\'instant, utilisez le classement des poules !');
};

console.log("✅ Système de poules optionnel chargé avec succès !");

// ======================================
// SYSTÈME DE PHASES FINALES MANUELLES - SYNTAXE CORRIGÉE
// ======================================

// Extension de la structure pour les phases finales manuelles
function initializeManualFinalPhase(dayNumber) {
    const dayData = championship.days[dayNumber];
    
    if (dayData.pools && !dayData.pools.manualFinalPhase) {
        dayData.pools.manualFinalPhase = {
            enabled: false,
            currentRound: null,
            divisions: {
                1: { 
                    qualified: [],
                    rounds: {},
                    champion: null,
                    runnerUp: null,
                    third: null,
                    fourth: null
                },
                2: { 
                    qualified: [],
                    rounds: {},
                    champion: null,
                    runnerUp: null,
                    third: null,
                    fourth: null
                },
                3: { 
                    qualified: [],
                    rounds: {},
                    champion: null,
                    runnerUp: null,
                    third: null,
                    fourth: null
                }
            }
        };
    }
}

// ======================================
// FONCTION MANQUANTE - getQualifiedPlayersFromPools
// ======================================

function getQualifiedPlayersFromPools(pools, matches, qualifiedPerPool) {
    const allQualified = [];
    
    pools.forEach((pool, poolIndex) => {
        // Calculer le classement de cette poule
        const playerStats = pool.map(player => {
            let wins = 0, losses = 0, setsWon = 0, setsLost = 0, pointsWon = 0, pointsLost = 0;
            
            const poolMatches = matches.filter(m => m.poolIndex === poolIndex && m.completed);
            
            poolMatches.forEach(match => {
                const isPlayer1 = match.player1 === player;
                const isPlayer2 = match.player2 === player;
                
                if (isPlayer1 || isPlayer2) {
                    if (match.winner === player) wins++;
                    else losses++;
                    
                    match.sets.forEach(set => {
                        if (set.player1Score !== '' && set.player2Score !== '') {
                            const score1 = parseInt(set.player1Score);
                            const score2 = parseInt(set.player2Score);
                            
                            if (isPlayer1) {
                                if (score1 > score2) setsWon++;
                                else if (score2 > score1) setsLost++;
                                pointsWon += score1;
                                pointsLost += score2;
                            } else {
                                if (score2 > score1) setsWon++;
                                else if (score1 > score2) setsLost++;
                                pointsWon += score2;
                                pointsLost += score1;
                            }
                        }
                    });
                }
            });
            
            return {
                name: player,
                wins, losses, setsWon, setsLost,
                setsDiff: setsWon - setsLost,
                pointsWon, pointsLost,
                pointsDiff: pointsWon - pointsLost,
                points: wins * 3 + losses * 1,
                poolIndex: poolIndex,
                poolName: String.fromCharCode(65 + poolIndex)
            };
        });

        // Trier par points puis par différence de sets puis par différence de points
        playerStats.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;
            return b.pointsDiff - a.pointsDiff;
        });
        
        const qualified = playerStats.slice(0, qualifiedPerPool);
        qualified.forEach(player => {
            player.seed = allQualified.length + 1; // Seed global
        });
        
        allQualified.push(...qualified);
    });
    
    return allQualified;
}

// Fonction principale pour générer les phases finales manuelles
function generateManualFinalPhase(dayNumber) {
    console.log("🏆 Génération phase finale MANUELLE pour journée", dayNumber);
    
    const dayData = championship.days[dayNumber];
    if (!dayData.pools || !dayData.pools.enabled) {
        alert('Les phases finales ne sont disponibles qu\'en mode Poules !');
        return;
    }
    
    // Vérifier que toutes les poules sont terminées
    if (!checkPoolsCompletion(dayNumber)) {
        alert('⚠️ Terminez d\'abord toutes les poules avant de générer la phase finale !');
        return;
    }
    
    initializeManualFinalPhase(dayNumber);
    
    const qualifiedPerPool = parseInt(document.getElementById(`qualified-per-pool-${dayNumber}`).value);
    let totalQualified = 0;
    
    // Qualifier les joueurs de chaque division
    for (let division = 1; division <= 3; division++) {
        const pools = dayData.pools.divisions[division].pools;
        const matches = dayData.pools.divisions[division].matches;
        
        if (pools.length === 0) continue;
        
        const qualified = getQualifiedPlayersFromPools(pools, matches, qualifiedPerPool);
        dayData.pools.manualFinalPhase.divisions[division].qualified = qualified;
        totalQualified += qualified.length;
        
        // Déterminer le premier tour selon le nombre de qualifiés
        const firstRoundName = determineFirstRound(qualified.length);
        if (firstRoundName && qualified.length >= 4) {
            generateFirstRound(dayNumber, division, qualified, firstRoundName);
        }
    }
    
    dayData.pools.manualFinalPhase.enabled = true;
    
    // Mettre à jour l'affichage
    updateManualFinalPhaseDisplay(dayNumber);
    saveToLocalStorage();
    
    alert(`🏆 Phase finale initialisée !\n\n${totalQualified} joueurs qualifiés au total.\n\nVous pouvez maintenant gérer les tours un par un !`);
}

function determineFirstRound(numPlayers) {
    if (numPlayers >= 16) return "16èmes";
    if (numPlayers >= 8) return "8èmes";
    if (numPlayers >= 4) return "Quarts";
    return null;
}

function generateFirstRound(dayNumber, division, qualified, roundName) {
    const dayData = championship.days[dayNumber];
    const rounds = dayData.pools.manualFinalPhase.divisions[division].rounds;
    
    console.log(`🎯 Génération ${roundName} pour Division ${division} avec ${qualified.length} joueurs`);
    
    // Créer le tableau équilibré
    const seededPlayers = organizeSeeds(qualified);
    const matches = [];
    
    for (let i = 0; i < seededPlayers.length; i += 2) {
        const player1 = seededPlayers[i];
        const player2 = seededPlayers[i + 1] || { name: 'BYE', isBye: true };
        
        const matchData = {
            id: `${roundName}-${division}-${Math.floor(i/2) + 1}`,
            player1: player1.name,
            player2: player2.name,
            player1Seed: player1.seed,
            player2Seed: player2.seed || null,
            sets: [
                { player1Score: '', player2Score: '' },
                { player1Score: '', player2Score: '' },
                { player1Score: '', player2Score: '' }
            ],
            completed: player2.isBye || false,
            winner: player2.isBye ? player1.name : null,
            roundName: roundName,
            position: Math.floor(i/2) + 1,
            isBye: player2.isBye || false
        };
        
        matches.push(matchData);
    }
    
    rounds[roundName] = {
        name: roundName,
        matches: matches,
        completed: false,
        nextRound: getNextRoundName(roundName)
    };
    
    // Marquer comme tour actuel
    dayData.pools.manualFinalPhase.currentRound = roundName;
    
    console.log(`✅ ${roundName} créé avec ${matches.length} matchs`);
}

function getNextRoundName(currentRound) {
    const sequence = ["16èmes", "8èmes", "Quarts", "Demi-finales", "Finale"];
    const currentIndex = sequence.indexOf(currentRound);
    return currentIndex >= 0 && currentIndex < sequence.length - 1 ? sequence[currentIndex + 1] : null;
}

function organizeSeeds(qualified) {
    return qualified.sort((a, b) => a.seed - b.seed);
}

// ======================================
// AFFICHAGE DES PHASES FINALES MANUELLES
// ======================================

function updateManualFinalPhaseDisplay(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData.pools || !dayData.pools.manualFinalPhase || !dayData.pools.manualFinalPhase.enabled) {
        return;
    }
    
    for (let division = 1; division <= 3; division++) {
        const container = document.getElementById(`division${dayNumber}-${division}-matches`);
        if (!container) continue;
        
        const finalPhase = dayData.pools.manualFinalPhase.divisions[division];
        
        if (finalPhase.qualified.length === 0) continue;
        
        let html = generateManualFinalPhaseHTML(dayNumber, division, finalPhase);
        
        // Ajouter après les poules
        const poolsContainer = container.querySelector('.pools-container');
        if (poolsContainer) {
            // Supprimer ancien affichage phase finale
            const existingFinal = container.querySelector('.manual-final-phase-container');
            if (existingFinal) existingFinal.remove();
            
            poolsContainer.insertAdjacentHTML('afterend', html);
        }
    }
}

function generateManualFinalPhaseHTML(dayNumber, division, finalPhase) {
    const currentRound = championship.days[dayNumber].pools.manualFinalPhase.currentRound;
    const rounds = finalPhase.rounds;
    
    let html = `
        <div class="manual-final-phase-container" style="margin-top: 30px;">
            <div class="final-phase-header" style="
                background: linear-gradient(135deg, #8e44ad, #9b59b6);
                color: white;
                padding: 25px;
                border-radius: 15px;
                text-align: center;
                margin-bottom: 25px;
                box-shadow: 0 5px 15px rgba(142, 68, 173, 0.3);
            ">
                <h3 style="margin: 0 0 10px 0; font-size: 1.5rem;">
                    🏆 PHASE FINALE MANUELLE - Division ${division}
                </h3>
                <div style="font-size: 16px; opacity: 0.9;">
                    ${finalPhase.qualified.length} joueurs qualifiés
                </div>
                ${currentRound ? `
                    <div style="
                        background: rgba(255,255,255,0.2);
                        padding: 10px 20px;
                        border-radius: 20px;
                        margin-top: 15px;
                        display: inline-block;
                    ">
                        <strong>🎯 Tour actuel : ${currentRound}</strong>
                    </div>
                ` : ''}
            </div>
            
            <div class="qualified-players" style="
                background: linear-gradient(135deg, #e8f5e8, #d4edda);
                border: 2px solid #28a745;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 25px;
            ">
                <h4 style="color: #155724; margin-bottom: 15px; text-align: center;">
                    ✨ Joueurs Qualifiés des Poules
                </h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
                    ${finalPhase.qualified.map(player => `
                        <span style="
                            background: linear-gradient(135deg, #28a745, #20c997);
                            color: white;
                            padding: 8px 15px;
                            border-radius: 20px;
                            font-size: 14px;
                            font-weight: 600;
                            box-shadow: 0 3px 8px rgba(40, 167, 69, 0.3);
                        ">
                            #${player.seed} ${player.name} (${player.poolName})
                        </span>
                    `).join('')}
                </div>
            </div>
    `;
    
    // Afficher les tours
    if (Object.keys(rounds).length > 0) {
        html += generateRoundsHTML(dayNumber, division, rounds, currentRound);
    }
    
    // Afficher le podium si terminé
    const champion = getChampionFromFinalPhase(finalPhase);
    if (champion) {
        html += generatePodiumHTML(finalPhase);
    }
    
    html += '</div>';
    
    return html;
}

function generateRoundsHTML(dayNumber, division, rounds, currentRound) {
    let html = '';
    
    const roundOrder = ["16èmes", "8èmes", "Quarts", "Demi-finales", "Petite finale", "Finale"];
    
    for (const roundName of roundOrder) {
        if (!rounds[roundName]) continue;
        
        const round = rounds[roundName];
        const isCurrentRound = roundName === currentRound;
        const isCompleted = round.completed;
        const completedMatches = round.matches.filter(m => m.completed).length;
        const totalMatches = round.matches.length;
        
        html += `
            <div class="manual-round" style="
                background: ${isCurrentRound ? 'linear-gradient(135deg, #fff3cd, #ffeaa7)' : 'white'};
                border: 3px solid ${isCurrentRound ? '#ffc107' : isCompleted ? '#28a745' : '#6c757d'};
                border-radius: 15px;
                padding: 25px;
                margin-bottom: 25px;
                ${isCurrentRound ? 'box-shadow: 0 5px 20px rgba(255, 193, 7, 0.3);' : ''}
            ">
                <div class="round-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                ">
                    <h4 style="
                        margin: 0;
                        color: ${isCurrentRound ? '#856404' : isCompleted ? '#155724' : '#495057'};
                        font-size: 1.3rem;
                    ">
                        ${getRoundIcon(roundName)} ${roundName}
                    </h4>
                    <div style="
                        background: ${isCompleted ? '#d4edda' : isCurrentRound ? '#fff3cd' : '#f8f9fa'};
                        color: ${isCompleted ? '#155724' : isCurrentRound ? '#856404' : '#6c757d'};
                        padding: 8px 15px;
                        border-radius: 20px;
                        font-weight: bold;
                        font-size: 14px;
                    ">
                        ${completedMatches}/${totalMatches} terminés
                        ${isCompleted ? ' ✅' : isCurrentRound ? ' ⚡' : ' ⏳'}
                    </div>
                </div>
                
                <div class="round-matches" style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 15px;
                    margin-bottom: 20px;
                ">
                    ${round.matches.map(match => generateManualMatchHTML(dayNumber, division, match, roundName)).join('')}
                </div>
                
                ${generateRoundControlsHTML(dayNumber, division, round, roundName, completedMatches, totalMatches)}
            </div>
        `;
    }
    
    return html;
}

function getRoundIcon(roundName) {
    const icons = {
        "16èmes": "🎯",
        "8èmes": "🔥", 
        "Quarts": "⚡",
        "Demi-finales": "🚀",
        "Petite finale": "🥉",
        "Finale": "🏆"
    };
    return icons[roundName] || "🎲";
}

function generateManualMatchHTML(dayNumber, division, match, roundName) {
    const isCompleted = match.completed;
    const isActive = !match.isBye;
    
    return `
        <div class="manual-match" style="
            background: ${isCompleted ? '#d5f4e6' : isActive ? 'white' : '#f8f9fa'};
            border: 2px solid ${isCompleted ? '#28a745' : isActive ? '#007bff' : '#6c757d'};
            border-radius: 10px;
            padding: 15px;
            ${match.isBye ? 'opacity: 0.7;' : ''}
        ">
            <div class="match-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            ">
                <div class="match-title" style="
                    font-size: 13px;
                    color: #6c757d;
                    font-weight: bold;
                ">
                    Match ${match.position}
                </div>
                <div class="match-status" style="
                    font-size: 12px;
                    padding: 4px 10px;
                    border-radius: 15px;
                    font-weight: bold;
                    background: ${isCompleted ? '#d4edda' : isActive ? '#cce5ff' : '#e2e3e5'};
                    color: ${isCompleted ? '#155724' : isActive ? '#004085' : '#6c757d'};
                ">
                    ${isCompleted ? 'Terminé ✅' : match.isBye ? 'Qualifié ⚡' : 'En cours 🎯'}
                </div>
            </div>
            
            <div class="players" style="
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: ${match.isBye ? '0' : '15px'};
                font-size: 15px;
                text-align: center;
            ">
                ${match.player1Seed ? `#${match.player1Seed}` : ''} ${match.player1}
                ${!match.isBye ? ` VS ${match.player2Seed ? `#${match.player2Seed}` : ''} ${match.player2}` : ''}
            </div>
            
            ${match.isBye ? `
                <div style="
                    text-align: center;
                    color: #28a745;
                    font-style: italic;
                    padding: 10px;
                ">
                    Qualifié automatiquement
                </div>
            ` : `
                <div class="sets" style="
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin-bottom: 12px;
                ">
                    ${match.sets.map((set, setIndex) => `
                        <div style="
                            background: #f8f9fa;
                            border: 1px solid #dee2e6;
                            border-radius: 6px;
                            padding: 8px;
                            text-align: center;
                        ">
                            <div style="font-size: 11px; color: #6c757d; margin-bottom: 3px;">Set ${setIndex + 1}</div>
                            <div style="display: flex; align-items: center; justify-content: center; gap: 3px;">
                                <input type="number" 
                                       value="${set.player1Score || ''}" 
                                       onchange="updateManualMatchScore('${match.id}', ${setIndex}, 'player1Score', this.value, ${dayNumber})"
                                       onkeydown="handleManualMatchEnter(event, '${match.id}', ${dayNumber})"
                                       style="width: 35px; height: 30px; text-align: center; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;">
                                <span style="color: #6c757d;">-</span>
                                <input type="number" 
                                       value="${set.player2Score || ''}" 
                                       onchange="updateManualMatchScore('${match.id}', ${setIndex}, 'player2Score', this.value, ${dayNumber})"
                                       onkeydown="handleManualMatchEnter(event, '${match.id}', ${dayNumber})"
                                       style="width: 35px; height: 30px; text-align: center; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;">
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="match-result" style="
                    text-align: center;
                    padding: 8px;
                    border-radius: 6px;
                    font-weight: bold;
                    background: ${isCompleted ? '#d4edda' : '#fff3cd'};
                    color: ${isCompleted ? '#155724' : '#856404'};
                    font-size: 13px;
                ">
                    ${isCompleted && match.winner ? `🏆 ${match.winner} gagne` : 'En attente des scores'}
                </div>
            `}
        </div>
    `;
}

function generateRoundControlsHTML(dayNumber, division, round, roundName, completedMatches, totalMatches) {
    const allCompleted = completedMatches === totalMatches && totalMatches > 0;
    
    if (!allCompleted && roundName !== "Finale" && roundName !== "Petite finale") {
        return `
            <div style="
                text-align: center;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
                color: #6c757d;
                font-style: italic;
            ">
                Terminez tous les matchs pour passer au tour suivant
            </div>
        `;
    }
    
    if (allCompleted && (roundName === "Finale" || roundName === "Petite finale")) {
        return `
            <div style="
                text-align: center;
                padding: 20px;
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                border-radius: 10px;
                font-weight: bold;
            ">
                🎉 ${roundName} terminée ! Consultez le podium ci-dessous.
            </div>
        `;
    }
    
    // Cas spécial pour les demi-finales
    if (allCompleted && roundName === "Demi-finales") {
        return `
            <div style="
                text-align: center;
                padding: 20px;
                background: linear-gradient(135deg, #ffc107, #ffca2c);
                border-radius: 10px;
            ">
                <div style="color: #856404; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
                    ✅ Demi-finales terminées !
                </div>
                <div style="display: flex; gap: 15px; justify-content: center; margin-top: 15px;">
                    <button class="btn" onclick="generatePetiteFinale(${dayNumber}, ${division})" 
                            style="
                        background: linear-gradient(135deg, #fd7e14, #e55a00);
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 8px;
                        font-weight: bold;
                        cursor: pointer;
                    ">
                        🥉 Petite Finale
                    </button>
                    <button class="btn" onclick="generateFinale(${dayNumber}, ${division})" 
                            style="
                        background: linear-gradient(135deg, #dc3545, #c82333);
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 8px;
                        font-weight: bold;
                        cursor: pointer;
                    ">
                        🏆 Grande Finale
                    </button>
                </div>
            </div>
        `;
    }
    
    // Pour les autres tours terminés
    if (allCompleted) {
        const nextRound = round.nextRound;
        if (nextRound) {
            return `
                <div style="
                    text-align: center;
                    padding: 20px;
                    background: linear-gradient(135deg, #ffc107, #ffca2c);
                    border-radius: 10px;
                ">
                    <div style="color: #856404; font-weight: bold; margin-bottom: 15px; font-size: 16px;">
                        ✅ Tous les matchs sont terminés !
                    </div>
                    <div style="margin-bottom: 15px; color: #6c5f00;">
                        Qualifiés : ${getQualifiedFromRound(round).join(', ')}
                    </div>
                    <button class="btn" onclick="generateNextManualRound(${dayNumber}, ${division}, '${roundName}')" 
                            style="
                        background: linear-gradient(135deg, #28a745, #20c997);
                        color: white;
                        border: none;
                        padding: 12px 25px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        box-shadow: 0 3px 10px rgba(40, 167, 69, 0.3);
                    ">
                        🚀 Passer aux ${nextRound}
                    </button>
                </div>
            `;
        }
    }
    
    return '';
}

function getQualifiedFromRound(round) {
    return round.matches.filter(m => m.completed && m.winner).map(m => m.winner);
}

// ======================================
// FONCTIONS DE GESTION DES MATCHS
// ======================================

function updateManualMatchScore(matchId, setIndex, scoreField, value, dayNumber) {
    console.log(`📝 Score manuel: ${matchId} - Set ${setIndex} - ${scoreField} = ${value}`);
    
    const dayData = championship.days[dayNumber];
    let matchFound = false;
    
    // Chercher dans toutes les divisions et tous les tours
    for (let division = 1; division <= 3; division++) {
        const rounds = dayData.pools.manualFinalPhase.divisions[division].rounds;
        
        for (const roundName in rounds) {
            const round = rounds[roundName];
            const match = round.matches.find(m => m.id === matchId);
            
            if (match && !match.isBye) {
                match.sets[setIndex][scoreField] = value;
                checkManualMatchCompletion(match);
                matchFound = true;
                
                // Vérifier si le tour est terminé
                checkRoundCompletion(dayNumber, division, roundName);
                
                saveToLocalStorage();
                updateManualFinalPhaseDisplay(dayNumber);
                break;
            }
        }
        if (matchFound) break;
    }
    
    if (!matchFound) {
        console.error(`❌ Match ${matchId} non trouvé`);
    }
}

function handleManualMatchEnter(event, matchId, dayNumber) {
    if (event.key === 'Enter') {
        console.log(`⌨️ Enter sur match ${matchId}`);
        updateManualFinalPhaseDisplay(dayNumber);
    }
}

function checkManualMatchCompletion(match) {
    if (match.isBye) return;
    
    let player1Sets = 0;
    let player2Sets = 0;
    
    match.sets.forEach(set => {
        if (set.player1Score !== '' && set.player2Score !== '' && 
            !isNaN(set.player1Score) && !isNaN(set.player2Score)) {
            
            const score1 = parseInt(set.player1Score);
            const score2 = parseInt(set.player2Score);
            
            if (score1 > score2) player1Sets++;
            else if (score2 > score1) player2Sets++;
        }
    });
    
    const wasCompleted = match.completed;
    
    if (player1Sets >= 2) {
        match.completed = true;
        match.winner = match.player1;
    } else if (player2Sets >= 2) {
        match.completed = true;
        match.winner = match.player2;
    } else {
        match.completed = false;
        match.winner = null;
    }
    
    if (!wasCompleted && match.completed) {
        console.log(`🏆 Match ${match.id} terminé: ${match.winner} gagne`);
        showNotification(`🏆 ${match.winner} remporte le match !`, 'success');
    }
}

function checkRoundCompletion(dayNumber, division, roundName) {
    const round = championship.days[dayNumber].pools.manualFinalPhase.divisions[division].rounds[roundName];
    if (!round) return;
    
    const completedMatches = round.matches.filter(m => m.completed).length;
    const totalMatches = round.matches.length;
    
    const wasCompleted = round.completed;
    round.completed = (completedMatches === totalMatches && totalMatches > 0);
    
    if (!wasCompleted && round.completed) {
        console.log(`✅ ${roundName} terminé en Division ${division}`);
        showNotification(`✅ ${roundName} terminé ! Vous pouvez passer au tour suivant.`, 'info');
        
        // Mettre à jour l'affichage
        setTimeout(() => {
            updateManualFinalPhaseDisplay(dayNumber);
        }, 500);
    }
}

// ======================================
// GÉNÉRATION DES TOURS SUIVANTS
// ======================================

function generateNextManualRound(dayNumber, division, currentRoundName) {
    console.log(`🚀 Génération tour suivant après ${currentRoundName}`);
    
    const dayData = championship.days[dayNumber];
    const currentRound = dayData.pools.manualFinalPhase.divisions[division].rounds[currentRoundName];
    
    if (!currentRound.completed) {
        alert('⚠️ Terminez d\'abord tous les matchs du tour actuel !');
        return;
    }
    
    const nextRoundName = currentRound.nextRound;
    if (!nextRoundName) {
        console.log('Pas de tour suivant défini');
        return;
    }
    
    // Récupérer les gagnants
    const winners = currentRound.matches
        .filter(match => match.completed && match.winner)
        .map(match => ({
            name: match.winner,
            seed: match.winner === match.player1 ? match.player1Seed : match.player2Seed
        }));
    
    if (winners.length < 2) {
        alert('❌ Pas assez de gagnants pour créer le tour suivant !');
        return;
    }
    
    // Créer le tour suivant
    createManualRound(dayNumber, division, nextRoundName, winners);
    
    // Mettre à jour le tour actuel
    dayData.pools.manualFinalPhase.currentRound = nextRoundName;
    
    updateManualFinalPhaseDisplay(dayNumber);
    saveToLocalStorage();
    
    showNotification(`🎯 ${nextRoundName} générés ! ${winners.length} joueurs qualifiés.`, 'success');
}

function createManualRound(dayNumber, division, roundName, players) {
    const dayData = championship.days[dayNumber];
    const rounds = dayData.pools.manualFinalPhase.divisions[division].rounds;
    
    const matches = [];
    
    for (let i = 0; i < players.length; i += 2) {
        const player1 = players[i];
        const player2 = players[i + 1];
        
        if (player1 && player2) {
            const matchData = {
                id: `${roundName}-${division}-${Math.floor(i/2) + 1}`,
                player1: player1.name,
                player2: player2.name,
                player1Seed: player1.seed,
                player2Seed: player2.seed,
                sets: [
                    { player1Score: '', player2Score: '' },
                    { player1Score: '', player2Score: '' },
                    { player1Score: '', player2Score: '' }
                ],
                completed: false,
                winner: null,
                roundName: roundName,
                position: Math.floor(i/2) + 1,
                isBye: false
            };
            
            matches.push(matchData);
        }
    }
    
    rounds[roundName] = {
        name: roundName,
        matches: matches,
        completed: false,
        nextRound: getNextRoundName(roundName)
    };
    
    console.log(`✅ ${roundName} créé avec ${matches.length} matchs`);
}

// ======================================
// GESTION FINALE ET PETITE FINALE
// ======================================

function generateFinale(dayNumber, division) {
    console.log(`🏆 Génération de la GRANDE FINALE - Division ${division}`);
    
    const dayData = championship.days[dayNumber];
    const demiFinales = dayData.pools.manualFinalPhase.divisions[division].rounds["Demi-finales"];
    
    if (!demiFinales || !demiFinales.completed) {
        alert('⚠️ Les demi-finales doivent être terminées !');
        return;
    }
    
    // Récupérer les gagnants des demi-finales
    const finalistes = demiFinales.matches
        .filter(match => match.completed && match.winner)
        .map(match => ({
            name: match.winner,
            seed: match.winner === match.player1 ? match.player1Seed : match.player2Seed
        }));
    
    if (finalistes.length !== 2) {
        alert(`❌ Il faut exactement 2 finalistes ! (${finalistes.length} trouvés)`);
        return;
    }
    
    createManualRound(dayNumber, division, "Finale", finalistes);
    
    // Marquer la finale comme tour actuel
    dayData.pools.manualFinalPhase.currentRound = "Finale";
    
    updateManualFinalPhaseDisplay(dayNumber);
    saveToLocalStorage();
    
    showNotification(`🏆 GRANDE FINALE créée ! ${finalistes[0].name} vs ${finalistes[1].name}`, 'success');
}

function generatePetiteFinale(dayNumber, division) {
    console.log(`🥉 Génération de la PETITE FINALE - Division ${division}`);
    
    const dayData = championship.days[dayNumber];
    const demiFinales = dayData.pools.manualFinalPhase.divisions[division].rounds["Demi-finales"];
    
    if (!demiFinales || !demiFinales.completed) {
        alert('⚠️ Les demi-finales doivent être terminées !');
        return;
    }
    
    // Récupérer les perdants des demi-finales
    const perdants = demiFinales.matches
        .filter(match => match.completed && match.winner)
        .map(match => ({
            name: match.winner === match.player1 ? match.player2 : match.player1,
            seed: match.winner === match.player1 ? match.player2Seed : match.player1Seed
        }));
    
    if (perdants.length !== 2) {
        alert(`❌ Il faut exactement 2 perdants de demi-finale ! (${perdants.length} trouvés)`);
        return;
    }
    
    createManualRound(dayNumber, division, "Petite finale", perdants);
    
    updateManualFinalPhaseDisplay(dayNumber);
    saveToLocalStorage();
    
    showNotification(`🥉 PETITE FINALE créée ! ${perdants[0].name} vs ${perdants[1].name}`, 'info');
}

// ======================================
// PODIUM ET CLASSEMENT FINAL
// ======================================

function generatePodiumHTML(finalPhase) {
    const finale = finalPhase.rounds["Finale"];
    const petiteFinale = finalPhase.rounds["Petite finale"];
    
    if (!finale || !finale.completed) {
        return '';
    }
    
    const finaleMatch = finale.matches[0];
    if (!finaleMatch || !finaleMatch.completed) {
        return '';
    }
    
    const champion = finaleMatch.winner;
    const finaliste = finaleMatch.winner === finaleMatch.player1 ? finaleMatch.player2 : finaleMatch.player1;
    
    let troisieme = null;
    let quatrieme = null;
    
    if (petiteFinale && petiteFinale.completed && petiteFinale.matches[0] && petiteFinale.matches[0].completed) {
        const petiteFinaleMatch = petiteFinale.matches[0];
        troisieme = petiteFinaleMatch.winner;
        quatrieme = petiteFinaleMatch.winner === petiteFinaleMatch.player1 ? 
            petiteFinaleMatch.player2 : petiteFinaleMatch.player1;
    }
    
    return `
        <div class="podium-container" style="
            background: linear-gradient(135deg, #ffd700, #ffed4e);
            border: 3px solid #f39c12;
            border-radius: 20px;
            padding: 30px;
            margin-top: 30px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(243, 156, 18, 0.3);
        ">
            <h3 style="
                color: #b8860b;
                margin: 0 0 25px 0;
                font-size: 1.8rem;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            ">
                🏆 PODIUM FINAL
            </h3>
            
            <div class="podium" style="
                display: flex;
                justify-content: center;
                align-items: end;
                gap: 20px;
                margin: 25px 0;
            ">
                ${troisieme ? `
                    <div class="podium-place" style="
                        background: linear-gradient(135deg, #cd7f32, #b8722c);
                        color: white;
                        padding: 20px 15px;
                        border-radius: 15px;
                        min-width: 120px;
                        height: 100px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        box-shadow: 0 5px 15px rgba(205, 127, 50, 0.4);
                    ">
                        <div style="font-size: 2rem; margin-bottom: 5px;">🥉</div>
                        <div style="font-weight: bold; font-size: 16px;">${troisieme}</div>
                        <div style="font-size: 12px; opacity: 0.9;">3ème place</div>
                    </div>
                ` : ''}
                
                <div class="podium-place" style="
                    background: linear-gradient(135deg, #ffd700, #ffed4e);
                    color: #b8860b;
                    padding: 25px 20px;
                    border-radius: 15px;
                    min-width: 140px;
                    height: 140px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    box-shadow: 0 8px 25px rgba(255, 215, 0, 0.5);
                    transform: scale(1.1);
                ">
                    <div style="font-size: 3rem; margin-bottom: 8px;">🏆</div>
                    <div style="font-weight: bold; font-size: 18px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">
                        ${champion}
                    </div>
                    <div style="font-size: 14px; font-weight: bold;">CHAMPION</div>
                </div>
                
                <div class="podium-place" style="
                    background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
                    color: white;
                    padding: 20px 15px;
                    border-radius: 15px;
                    min-width: 120px;
                    height: 120px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    box-shadow: 0 5px 15px rgba(192, 192, 192, 0.4);
                ">
                    <div style="font-size: 2.5rem; margin-bottom: 5px;">🥈</div>
                    <div style="font-weight: bold; font-size: 16px;">${finaliste}</div>
                    <div style="font-size: 12px; opacity: 0.9;">Finaliste</div>
                </div>
            </div>
            
            ${quatrieme ? `
                <div style="
                    background: rgba(255, 255, 255, 0.8);
                    padding: 10px 20px;
                    border-radius: 10px;
                    margin-top: 15px;
                    color: #6c757d;
                ">
                    <strong>4ème place :</strong> ${quatrieme}
                </div>
            ` : ''}
            
            <div style="
                margin-top: 20px;
                font-size: 14px;
                color: #856404;
                font-style: italic;
            ">
                🎉 Félicitations à tous les participants ! 🎉
            </div>
        </div>
    `;
}

// ======================================
// FONCTIONS D'EXPORT ET UTILITAIRES
// ======================================

function exportManualFinalResults(dayNumber) {
    const dayData = championship.days[dayNumber];
    if (!dayData.pools || !dayData.pools.manualFinalPhase || !dayData.pools.manualFinalPhase.enabled) {
        alert('Aucune phase finale manuelle à exporter !');
        return;
    }
    
    const exportData = {
        version: "2.0",
        exportDate: new Date().toISOString(),
        exportType: "manual_final_phase_results",
        dayNumber: dayNumber,
        results: {}
    };
    
    for (let division = 1; division <= 3; division++) {
        const finalPhase = dayData.pools.manualFinalPhase.divisions[division];
        
        if (Object.keys(finalPhase.rounds).length > 0) {
            exportData.results[division] = {
                qualified: finalPhase.qualified,
                rounds: finalPhase.rounds,
                champion: getChampionFromFinalPhase(finalPhase),
                podium: getPodiumFromFinalPhase(finalPhase)
            };
        }
    }
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `resultats_phase_finale_manuelle_J${dayNumber}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification(`Résultats phase finale manuelle J${dayNumber} exportés !`, 'success');
}

function getChampionFromFinalPhase(finalPhase) {
    const finale = finalPhase.rounds["Finale"];
    if (finale && finale.completed && finale.matches[0] && finale.matches[0].completed) {
        return finale.matches[0].winner;
    }
    return null;
}

function getPodiumFromFinalPhase(finalPhase) {
    const finale = finalPhase.rounds["Finale"];
    const petiteFinale = finalPhase.rounds["Petite finale"];
    
    if (!finale || !finale.completed || !finale.matches[0] || !finale.matches[0].completed) {
        return null;
    }
    
    const finaleMatch = finale.matches[0];
    const podium = {
        champion: finaleMatch.winner,
        finaliste: finaleMatch.winner === finaleMatch.player1 ? finaleMatch.player2 : finaleMatch.player1,
        troisieme: null,
        quatrieme: null
    };
    
    if (petiteFinale && petiteFinale.completed && petiteFinale.matches[0] && petiteFinale.matches[0].completed) {
        const petiteFinaleMatch = petiteFinale.matches[0];
        podium.troisieme = petiteFinaleMatch.winner;
        podium.quatrieme = petiteFinaleMatch.winner === petiteFinaleMatch.player1 ? 
            petiteFinaleMatch.player2 : petiteFinaleMatch.player1;
    }
    
    return podium;
}

function resetManualFinalPhase(dayNumber) {
    if (!confirm('⚠️ Supprimer toute la phase finale manuelle ?\n\nCela supprimera tous les matchs et résultats, mais conservera les poules.')) {
        return;
    }
    
    const dayData = championship.days[dayNumber];
    if (dayData.pools && dayData.pools.manualFinalPhase) {
        dayData.pools.manualFinalPhase.enabled = false;
        dayData.pools.manualFinalPhase.currentRound = null;
        
        for (let division = 1; division <= 3; division++) {
            dayData.pools.manualFinalPhase.divisions[division] = {
                qualified: [],
                rounds: {},
                champion: null,
                runnerUp: null,
                third: null,
                fourth: null
            };
        }
    }
    
    // Supprimer l'affichage
    for (let division = 1; division <= 3; division++) {
        const container = document.getElementById(`division${dayNumber}-${division}-matches`);
        if (container) {
            const finalPhaseContainer = container.querySelector('.manual-final-phase-container');
            if (finalPhaseContainer) {
                finalPhaseContainer.remove();
            }
        }
    }
    
    saveToLocalStorage();
    showNotification('Phase finale manuelle réinitialisée', 'warning');
}

// ======================================
// INTÉGRATION AVEC LE SYSTÈME EXISTANT
// ======================================

// Remplacer la fonction generateFinalPhase existante
window.generateFinalPhase = generateManualFinalPhase;
window.updateManualMatchScore = updateManualMatchScore;
window.handleManualMatchEnter = handleManualMatchEnter;
window.generateNextManualRound = generateNextManualRound;
window.generateFinale = generateFinale;
window.generatePetiteFinale = generatePetiteFinale;
window.exportManualFinalResults = exportManualFinalResults;
window.resetManualFinalPhase = resetManualFinalPhase;

// Améliorer le bouton phase finale
const originalCheckPoolsCompletion = window.checkPoolsCompletion;
if (originalCheckPoolsCompletion) {
    window.checkPoolsCompletion = function(dayNumber) {
        const result = originalCheckPoolsCompletion(dayNumber);
        
        const finalButton = document.getElementById(`final-phase-btn-${dayNumber}`);
        if (finalButton && result) {
            const dayData = championship.days[dayNumber];
            if (dayData.pools && dayData.pools.manualFinalPhase && dayData.pools.manualFinalPhase.enabled) {
                finalButton.innerHTML = '🔄 Gérer Phase Finale';
                finalButton.style.background = 'linear-gradient(135deg, #8e44ad, #9b59b6)';
                finalButton.onclick = () => updateManualFinalPhaseDisplay(dayNumber);
            } else {
                finalButton.innerHTML = '🏆 Phase Finale Manuelle';
                finalButton.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';
            }
        }
        
        return result;
    };
}

// Hook pour l'initialisation
const originalInitializePoolsForDay = window.initializePoolsForDay;
if (originalInitializePoolsForDay) {
    window.initializePoolsForDay = function(dayNumber) {
        originalInitializePoolsForDay(dayNumber);
        
        // Initialiser les phases finales manuelles si elles existent
        const dayData = championship.days[dayNumber];
        if (dayData.pools && dayData.pools.manualFinalPhase && dayData.pools.manualFinalPhase.enabled) {
            initializeManualFinalPhase(dayNumber);
            updateManualFinalPhaseDisplay(dayNumber);
        }
    };
}

console.log("✅ Système de phases finales MANUELLES chargé avec succès !");
console.log("🎮 Fonctions disponibles :");
console.log("  - generateFinalPhase() : Initialiser les phases finales");
console.log("  - exportManualFinalResults() : Exporter les résultats"); 
console.log("  - resetManualFinalPhase() : Réinitialiser");
console.log("🏆 Contrôle total : Vous décidez quand passer au tour suivant !");

// ======================================
// CORRECTIF - SUPPRESSION SPINNERS ET AGRANDISSEMENT CHAMPS
// ======================================

// Ajouter ce CSS pour supprimer les spinners et agrandir les champs
function addScoreInputStyles() {
    // Vérifier si le style n'existe pas déjà
    if (document.getElementById('score-input-styles')) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'score-input-styles';
    style.textContent = `
        /* Supprimer les spinners des inputs number */
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none !important;
            margin: 0 !important;
        }
        
        input[type="number"] {
            -moz-appearance: textfield !important;
        }
        
        /* Agrandir les champs de score dans les phases finales */
        .manual-match input[type="number"] {
            width: 45px !important;
            height: 35px !important;
            font-size: 15px !important;
            font-weight: bold !important;
            text-align: center !important;
            padding: 8px 4px !important;
            border: 2px solid #007bff !important;
            border-radius: 6px !important;
            background: white !important;
        }
        
        .manual-match input[type="number"]:focus {
            border-color: #0056b3 !important;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25) !important;
            outline: none !important;
        }
        
        /* Améliorer aussi la lisibilité du séparateur */
        .manual-match .sets span {
            font-size: 16px !important;
            font-weight: bold !important;
            color: #495057 !important;
            margin: 0 2px !important;
        }
        
        /* Espacement des sets */
        .manual-match .sets > div {
            padding: 10px 8px !important;
        }
    `;
    
    document.head.appendChild(style);
    console.log("✅ Styles des champs de score améliorés - Spinners supprimés, champs agrandis");
}

// Fonction pour mettre à jour le HTML de génération des matchs avec de plus gros champs
function generateManualMatchHTMLImproved(dayNumber, division, match, roundName) {
    const isCompleted = match.completed;
    const isActive = !match.isBye;
    
    return `
        <div class="manual-match" style="
            background: ${isCompleted ? '#d5f4e6' : isActive ? 'white' : '#f8f9fa'};
            border: 2px solid ${isCompleted ? '#28a745' : isActive ? '#007bff' : '#6c757d'};
            border-radius: 10px;
            padding: 15px;
            ${match.isBye ? 'opacity: 0.7;' : ''}
        ">
            <div class="match-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            ">
                <div class="match-title" style="
                    font-size: 13px;
                    color: #6c757d;
                    font-weight: bold;
                ">
                    Match ${match.position}
                </div>
                <div class="match-status" style="
                    font-size: 12px;
                    padding: 4px 10px;
                    border-radius: 15px;
                    font-weight: bold;
                    background: ${isCompleted ? '#d4edda' : isActive ? '#cce5ff' : '#e2e3e5'};
                    color: ${isCompleted ? '#155724' : isActive ? '#004085' : '#6c757d'};
                ">
                    ${isCompleted ? 'Terminé ✅' : match.isBye ? 'Qualifié ⚡' : 'En cours 🎯'}
                </div>
            </div>
            
            <div class="players" style="
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: ${match.isBye ? '0' : '18px'};
                font-size: 16px;
                text-align: center;
            ">
                ${match.player1Seed ? `#${match.player1Seed}` : ''} ${match.player1}
                ${!match.isBye ? ` VS ${match.player2Seed ? `#${match.player2Seed}` : ''} ${match.player2}` : ''}
            </div>
            
            ${match.isBye ? `
                <div style="
                    text-align: center;
                    color: #28a745;
                    font-style: italic;
                    padding: 10px;
                ">
                    Qualifié automatiquement
                </div>
            ` : `
                <div class="sets" style="
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    margin-bottom: 15px;
                ">
                    ${match.sets.map((set, setIndex) => `
                        <div style="
                            background: #f8f9fa;
                            border: 1px solid #dee2e6;
                            border-radius: 8px;
                            padding: 10px 8px;
                            text-align: center;
                        ">
                            <div style="font-size: 12px; color: #6c757d; margin-bottom: 5px; font-weight: bold;">
                                Set ${setIndex + 1}
                            </div>
                            <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                                <input type="number" 
                                       value="${set.player1Score || ''}" 
                                       placeholder=""
                                       min="0"
                                       max="30"
                                       onchange="updateManualMatchScore('${match.id}', ${setIndex}, 'player1Score', this.value, ${dayNumber})"
                                       onkeydown="handleManualMatchEnter(event, '${match.id}', ${dayNumber})"
                                       style="
                                           width: 45px; 
                                           height: 35px; 
                                           text-align: center; 
                                           border: 2px solid #007bff; 
                                           border-radius: 6px; 
                                           font-size: 15px;
                                           font-weight: bold;
                                           background: white;
                                           padding: 8px 4px;
                                       ">
                                <span style="color: #495057; font-weight: bold; font-size: 16px; margin: 0 2px;">-</span>
                                <input type="number" 
                                       value="${set.player2Score || ''}" 
                                       placeholder=""
                                       min="0"
                                       max="30"
                                       onchange="updateManualMatchScore('${match.id}', ${setIndex}, 'player2Score', this.value, ${dayNumber})"
                                       onkeydown="handleManualMatchEnter(event, '${match.id}', ${dayNumber})"
                                       style="
                                           width: 45px; 
                                           height: 35px; 
                                           text-align: center; 
                                           border: 2px solid #007bff; 
                                           border-radius: 6px; 
                                           font-size: 15px;
                                           font-weight: bold;
                                           background: white;
                                           padding: 8px 4px;
                                       ">
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="match-result" style="
                    text-align: center;
                    padding: 10px;
                    border-radius: 6px;
                    font-weight: bold;
                    background: ${isCompleted ? '#d4edda' : '#fff3cd'};
                    color: ${isCompleted ? '#155724' : '#856404'};
                    font-size: 14px;
                ">
                    ${isCompleted && match.winner ? `🏆 ${match.winner} gagne` : 'En attente des scores'}
                </div>
            `}
        </div>
    `;
}

// Remplacer la fonction existante
window.generateManualMatchHTML = generateManualMatchHTMLImproved;

// Appliquer les styles au chargement
addScoreInputStyles();

console.log("✅ Champs de score améliorés - Plus grands, sans spinners, meilleure UX !");

    // ======================================
// FONCTION MANQUANTE - getQualifiedPlayersFromPools
// ======================================

function getQualifiedPlayersFromPools(pools, matches, qualifiedPerPool) {
    const allQualified = [];
    
    pools.forEach((pool, poolIndex) => {
        // Calculer le classement de cette poule
        const playerStats = pool.map(player => {
            let wins = 0, losses = 0, setsWon = 0, setsLost = 0, pointsWon = 0, pointsLost = 0;
            
            const poolMatches = matches.filter(m => m.poolIndex === poolIndex && m.completed);
            
            poolMatches.forEach(match => {
                const isPlayer1 = match.player1 === player;
                const isPlayer2 = match.player2 === player;
                
                if (isPlayer1 || isPlayer2) {
                    if (match.winner === player) wins++;
                    else losses++;
                    
                    match.sets.forEach(set => {
                        if (set.player1Score !== '' && set.player2Score !== '') {
                            const score1 = parseInt(set.player1Score);
                            const score2 = parseInt(set.player2Score);
                            
                            if (isPlayer1) {
                                if (score1 > score2) setsWon++;
                                else if (score2 > score1) setsLost++;
                                pointsWon += score1;
                                pointsLost += score2;
                            } else {
                                if (score2 > score1) setsWon++;
                                else if (score1 > score2) setsLost++;
                                pointsWon += score2;
                                pointsLost += score1;
                            }
                        }
                    });
                }
            });
            
            return {
                name: player,
                wins, losses, setsWon, setsLost,
                setsDiff: setsWon - setsLost,
                pointsWon, pointsLost,
                pointsDiff: pointsWon - pointsLost,
                points: wins * 3 + losses * 1,
                poolIndex: poolIndex,
                poolName: String.fromCharCode(65 + poolIndex)
            };
        });

        // Trier par points puis par différence de sets puis par différence de points
        playerStats.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;
            return b.pointsDiff - a.pointsDiff;
        });
        
        const qualified = playerStats.slice(0, qualifiedPerPool);
        qualified.forEach(player => {
            player.seed = allQualified.length + 1; // Seed global
        });
        
        allQualified.push(...qualified);
    });
    
    return allQualified;
}

// ======================================
// SYSTÈME D'IMPRESSION DES FEUILLES DE MATCH
// ======================================

// Fonction principale pour imprimer les feuilles de match
function printMatchSheets(dayNumber) {
    if (!dayNumber) dayNumber = championship.currentDay;
    
    console.log(`📋 Génération des feuilles de match pour la Journée ${dayNumber}`);
    
    const dayData = championship.days[dayNumber];
    if (!dayData) {
        alert('Aucune donnée trouvée pour cette journée !');
        return;
    }
    
    // Collecter tous les matchs de toutes les divisions
    let allMatches = [];
    let hasMatches = false;
    
    for (let division = 1; division <= 3; division++) {
        const divisionMatches = getDivisionMatches(dayData, division, dayNumber);
        if (divisionMatches.length > 0) {
            allMatches.push(...divisionMatches);
            hasMatches = true;
        }
    }
    
    if (!hasMatches) {
        alert('⚠️ Aucun match généré pour cette journée !\n\nVeuillez d\'abord générer les matchs ou les poules.');
        return;
    }

    // Grouper les matchs par pages (4 matchs par page : 1 de chaque tour)
    const matchPages = groupMatchesIntoPages(allMatches);

    // Générer le HTML d'impression
    const printHTML = generateMatchSheetHTML(dayNumber, matchPages);

    // Ouvrir dans une nouvelle fenêtre pour impression
    openPrintWindow(printHTML, `Feuilles_de_match_J${dayNumber}`);

    showNotification(`📋 ${matchPages.length} page(s) générée(s) - ${allMatches.length} matchs au total !`, 'success');
}

// Récupérer les matchs d'une division (Round-Robin ou Poules)
function getDivisionMatches(dayData, division, dayNumber) {
    const matches = [];
    
    // Vérifier d'abord le mode poules
    if (dayData.pools && dayData.pools.enabled && dayData.pools.divisions[division].matches.length > 0) {
        // Mode poules
        const poolMatches = dayData.pools.divisions[division].matches;
        poolMatches.forEach((match, index) => {
            matches.push({
                matchId: `J${dayNumber}-D${division}-P${match.poolIndex + 1}-M${index + 1}`,
                division: division,
                player1: match.player1,
                player2: match.player2,
                type: 'Poule',
                poolName: match.poolName || `Poule ${String.fromCharCode(65 + match.poolIndex)}`,
                tour: null,
                dayNumber: dayNumber
            });
        });
    } else if (dayData.matches[division].length > 0) {
        // Mode Round-Robin classique
        const roundRobinMatches = dayData.matches[division];
        roundRobinMatches.forEach((match, index) => {
            matches.push({
                matchId: `J${dayNumber}-D${division}-T${match.tour}-M${index + 1}`,
                division: division,
                player1: match.player1,
                player2: match.player2,
                type: 'Round-Robin',
                tour: match.tour,
                poolName: null,
                dayNumber: dayNumber
            });
        });
    }
    
    return matches;
}

// Grouper les matchs en pages - 1 match de chaque tour par page (4 matchs/page)
function groupMatchesIntoPages(matches, matchesPerPage) {
    const pages = [];

    // Séparer les matchs par tour
    const matchesByTour = {
        1: [],
        2: [],
        3: [],
        4: []
    };

    // Grouper les matchs par tour
    matches.forEach(match => {
        if (match.tour && matchesByTour[match.tour]) {
            matchesByTour[match.tour].push(match);
        }
    });

    // Déterminer le nombre maximum de matchs dans un tour
    const maxMatchesInAnyTour = Math.max(
        matchesByTour[1].length,
        matchesByTour[2].length,
        matchesByTour[3].length,
        matchesByTour[4].length
    );

    // Créer les pages : chaque page contient 1 match de chaque tour
    for (let i = 0; i < maxMatchesInAnyTour; i++) {
        const page = [];

        // Ajouter un match de chaque tour (dans l'ordre : tour 1, 2, 3, 4)
        for (let tour = 1; tour <= 4; tour++) {
            if (matchesByTour[tour][i]) {
                page.push(matchesByTour[tour][i]);
            }
        }

        // N'ajouter la page que si elle contient au moins un match
        if (page.length > 0) {
            pages.push(page);
        }
    }

    return pages;
}

// Remplacez seulement cette fonction dans votre code existant :

// Générer le HTML complet pour l'impression - VERSION COMPACTE
function generateMatchSheetHTML(dayNumber, matchPages) {
    const currentDate = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
    
    let htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Feuilles de Match - Journée ${dayNumber}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: Arial, sans-serif;
                    font-size: 9px;
                    line-height: 1.1;
                    color: #000;
                    background: white;
                    padding: 4mm;
                }

                .page {
                    width: 100%;
                    page-break-after: always;
                    background: white;
                    height: 277mm;
                }

                .page:last-child {
                    page-break-after: avoid;
                }

                .page-header {
                    text-align: center;
                    margin-bottom: 3mm;
                    padding-bottom: 2mm;
                    border-bottom: 1.5px solid #000;
                }

                .page-title {
                    font-size: 12px;
                    font-weight: bold;
                    margin-bottom: 1mm;
                }

                .page-info {
                    font-size: 8px;
                    color: #666;
                }

                .match-sheet {
                    border: 1.5px solid #000;
                    margin-bottom: 0;
                    padding: 2mm;
                    page-break-inside: avoid;
                    background: white;
                    position: relative;
                    height: 65mm;
                }

                .match-sheet:not(:last-child)::after {
                    content: "✂️ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂️";
                    display: block;
                    text-align: center;
                    color: #999;
                    font-size: 7px;
                    margin: 1.5mm -2mm -2mm -2mm;
                    padding: 0.5mm 0;
                    letter-spacing: 0.5px;
                }

                .match-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 1.5mm;
                    font-weight: bold;
                    font-size: 9px;
                }

                .match-id {
                    background: #f0f0f0;
                    padding: 0.5mm 1.5mm;
                    border: 1px solid #666;
                    font-size: 8px;
                }

                .players-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2mm;
                    font-size: 10px;
                    font-weight: bold;
                }

                .player-name {
                    flex: 1;
                    text-align: center;
                    padding: 1.5mm;
                    border: 1px solid #000;
                    background: #f8f8f8;
                    font-size: 9px;
                }

                .vs-text {
                    padding: 0 2mm;
                    font-size: 8px;
                }

                .score-section {
                    margin-bottom: 1mm;
                }

                .score-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 8px;
                }

                .score-table th {
                    background: #000;
                    color: white;
                    padding: 1mm;
                    text-align: center;
                    font-size: 7px;
                    border: 1px solid #000;
                }

                .score-table td {
                    padding: 1mm;
                    text-align: center;
                    border: 1px solid #000;
                    height: 6mm;
                }
                
                .player-col {
                    background: #f0f0f0;
                    font-weight: bold;
                    font-size: 9px;
                    width: 25%;
                }
                
                .score-col {
                    width: 15%;
                    background: white;
                }
                
                .total-col {
                    width: 15%;
                    background: #e8e8e8;
                    font-weight: bold;
                }
                
                .result-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 8px;
                    margin-top: 1mm;
                }
                
                .result-box {
                    flex: 1;
                    margin: 0 1mm;
                }
                
                .result-label {
                    font-weight: bold;
                    margin-bottom: 1mm;
                }
                
                .result-line {
                    border-bottom: 1px solid #000;
                    height: 4mm;
                }

                @media print {
                    body {
                        padding: 4mm !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }

                    .page {
                        margin: 0;
                        width: 100%;
                        height: 277mm !important;
                    }

                    .match-sheet {
                        border: 1.5px solid #000 !important;
                        margin-bottom: 0 !important;
                        height: 65mm !important;
                    }
                    
                    .score-table th {
                        background: #000 !important;
                        color: white !important;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                    
                    .player-col {
                        background: #f0f0f0 !important;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                    
                    .total-col {
                        background: #e8e8e8 !important;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                }
                
                @page {
                    margin: 8mm;
                    size: A4 portrait;
                }
            </style>
        </head>
        <body>
    `;
    
    // Générer chaque page
    matchPages.forEach((pageMatches, pageIndex) => {
        htmlContent += `
            <div class="page">
                <div class="page-header">
                    <div class="page-title">🏓 FEUILLES DE MATCH - JOURNÉE ${dayNumber}</div>
                    <div class="page-info">${currentDate} • Page ${pageIndex + 1}/${matchPages.length} • ${pageMatches.length} matchs</div>
                    <div class="page-info" style="margin-top: 2mm; font-size: 8px; color: #999;">
                        ✂️ Découpez selon les pointillés pour trier par tour
                    </div>
                </div>
        `;
        
        // Générer chaque match de la page
        pageMatches.forEach(match => {
            htmlContent += generateCompactMatchSheet(match);
        });
        
        htmlContent += `</div>`;
    });
    
    htmlContent += `
        </body>
        </html>
    `;
    
    return htmlContent;
}

// Générer une feuille de match compacte
function generateCompactMatchSheet(match) {
    const divisionName = match.division === 1 ? 'D1🥇' :
                        match.division === 2 ? 'D2🥈' : 'D3🥉';

    const matchInfo = match.type === 'Poule' ?
        `${match.poolName}` :
        `Tour ${match.tour}`;

    // Ligne de séparation avec numéro de tour pour faciliter le découpage
    const tourColors = {
        1: '#e74c3c',  // Rouge
        2: '#f39c12',  // Orange
        3: '#27ae60',  // Vert
        4: '#3498db'   // Bleu
    };
    const tourColor = tourColors[match.tour] || '#333';

    const tourIndicator = match.tour ?
        `<div style="background: ${tourColor}; color: white; text-align: center; padding: 1.5mm; margin: -2mm -2mm 1.5mm -2mm; font-weight: bold; font-size: 10px; border-bottom: 1px dashed #ccc; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            🎯 TOUR ${match.tour}
        </div>` : '';

    return `
        <div class="match-sheet">
            ${tourIndicator}
            <div class="match-header">
                <div class="match-id">${match.matchId} • ${divisionName}</div>
                <div>${match.type} • ${matchInfo}</div>
            </div>
            
            <div class="players-row">
                <div class="player-name">${match.player1}</div>
                <div class="vs-text">VS</div>
                <div class="player-name">${match.player2}</div>
            </div>
            
            <div class="score-section">
                <table class="score-table">
                    <thead>
                        <tr>
                            <th>JOUEUR</th>
                            <th>SET 1</th>
                            <th>SET 2</th>
                            <th>SET 3</th>
                            <th>TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="player-col">${match.player1}</td>
                            <td class="score-col"></td>
                            <td class="score-col"></td>
                            <td class="score-col"></td>
                            <td class="total-col"></td>
                        </tr>
                        <tr>
                            <td class="player-col">${match.player2}</td>
                            <td class="score-col"></td>
                            <td class="score-col"></td>
                            <td class="score-col"></td>
                            <td class="total-col"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="result-row">
                <div class="result-box">
                    <div class="result-label">VAINQUEUR:</div>
                    <div class="result-line"></div>
                </div>
                <div class="result-box">
                    <div class="result-label">ARBITRE:</div>
                    <div class="result-line"></div>
                </div>
            </div>
        </div>
    `;
}

// Exporter les nouvelles fonctions
window.generateMatchSheetHTML = generateMatchSheetHTML;
window.generateCompactMatchSheet = generateCompactMatchSheet;

console.log('✅ Version compacte installée - 5 matchs par page optimisés !');



// Ouvrir la fenêtre d'impression
function openPrintWindow(htmlContent, filename) {
    const printWindow = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes,resizable=yes');
    
    if (!printWindow) {
        alert('❌ Impossible d\'ouvrir la fenêtre d\'impression.\n\nVeuillez autoriser les pop-ups pour ce site.');
        return;
    }
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Attendre que le contenu soit chargé
    setTimeout(() => {
        printWindow.focus();
        
        const shouldPrint = printWindow.confirm(
            '📋 Feuilles de match générées avec succès !\n\n' +
            '🖨️ Voulez-vous ouvrir la boîte de dialogue d\'impression maintenant ?\n\n' +
            '💡 Organisation :\n' +
            '   • Chaque page A4 contient 4 matchs (1 de chaque tour)\n' +
            '   • Découpez selon les lignes pointillées ✂️\n' +
            '   • Vous obtiendrez 4 tas déjà triés par tour !\n\n' +
            '📄 Format recommandé : A4 Portrait'
        );
        
        if (shouldPrint) {
            printWindow.print();
        }
    }, 1000);
}

// Fonction pour ajouter le bouton à l'interface
function addPrintMatchesButton() {
    // Trouver tous les .control-buttons dans chaque journée
    const allControlButtons = document.querySelectorAll('.control-buttons');
    
    allControlButtons.forEach(controlButtonsContainer => {
        // Vérifier si le bouton n'existe pas déjà
        if (controlButtonsContainer.querySelector('.print-matches-btn')) {
            return;
        }
        
        // Trouver le dayNumber à partir du contexte
        const dayContent = controlButtonsContainer.closest('.day-content');
        if (!dayContent) return;
        
        const dayNumber = parseInt(dayContent.id.replace('day-', ''));
        if (isNaN(dayNumber)) return;
        
        // Créer le bouton
        const printButton = document.createElement('button');
        printButton.className = 'btn print-matches-btn';
        printButton.innerHTML = '📋 Imprimer Matchs';
        printButton.style.background = 'linear-gradient(135deg, #8e44ad, #9b59b6)';
        printButton.style.color = 'white';
        printButton.onclick = () => printMatchSheets(dayNumber);
        printButton.title = 'Imprimer les feuilles de match pour les arbitres';
        
        // Insérer après le bouton "Classements" s'il existe
        const rankingsButton = controlButtonsContainer.querySelector('button[onclick*="updateRankings"]');
        if (rankingsButton) {
            rankingsButton.insertAdjacentElement('afterend', printButton);
        } else {
            // Sinon l'insérer au début
            controlButtonsContainer.insertBefore(printButton, controlButtonsContainer.firstChild);
        }
    });
}

// ===============================================
// EXPORT EXPLICITE VERS WINDOW - TRÈS IMPORTANT
// ===============================================
window.printMatchSheets = printMatchSheets;
window.addPrintMatchesButton = addPrintMatchesButton;
window.getDivisionMatches = getDivisionMatches;
window.groupMatchesIntoPages = groupMatchesIntoPages;
window.generateMatchSheetHTML = generateMatchSheetHTML;
window.generateCompactMatchSheet = generateCompactMatchSheet;
window.openPrintWindow = openPrintWindow;

console.log('✅ Système d\'impression des feuilles de match installé !');
console.log('📋 Fonctions exportées vers window:', Object.keys(window).filter(k => k.includes('print')));

// Ajouter automatiquement les boutons au chargement et lors de la création de nouvelles journées
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 DOM chargé - Ajout des boutons d\'impression...');
    setTimeout(addPrintMatchesButton, 1000);
});

// Hook pour les nouvelles journées
const originalCreateDayContent = window.createDayContent;
if (originalCreateDayContent) {
    window.createDayContent = function(dayNumber) {
        const result = originalCreateDayContent(dayNumber);
        setTimeout(() => {
            console.log(`🔄 Journée ${dayNumber} créée - Ajout bouton impression...`);
            addPrintMatchesButton();
        }, 200);
        return result;
    };
    console.log('🎣 Hook createDayContent installé');
}

// Ajouter immédiatement si le DOM est déjà chargé
if (document.readyState === 'loading') {
    // DOM pas encore chargé
    console.log('⏳ DOM en cours de chargement...');
} else {
    // DOM déjà chargé
    console.log('✅ DOM déjà chargé - Ajout immédiat des boutons...');
    setTimeout(addPrintMatchesButton, 500);
}
    // MODAL DE VÉRIFICATION DES DOUBLONS
    function showDuplicatePlayersModal() {
        const similar = findSimilarPlayers();
        const content = document.getElementById('duplicatePlayersContent');
        let html = '';
        let hasDuplicates = false;
        
        for (let division = 1; division <= 3; division++) {
            const divSimilar = similar[division];
            if (divSimilar.length === 0) continue;
            hasDuplicates = true;
            
            html += `<div style="margin-bottom: 25px;">
                <h4 style="color: #e67e22; margin-bottom: 15px;">Division ${division}</h4>
                <table class="ranking-table">
                    <thead>
                        <tr>
                            <th>Joueur A</th>
                            <th>Joueur B</th>
                            <th>Similarité</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>`;
            
            divSimilar.forEach(pair => {
                const simPercent = Math.round(pair.similarity * 100);
                const color = simPercent >= 90 ? '#e74c3c' : simPercent >= 80 ? '#f39c12' : '#f1c40f';
                const escName1 = pair.name1.replace(/'/g, "\\'");
                const escName2 = pair.name2.replace(/'/g, "\\'");
                html += `
                    <tr>
                        <td style="font-weight: 600;">${pair.name1}</td>
                        <td style="font-weight: 600;">${pair.name2}</td>
                        <td><span style="color: ${color}; font-weight: bold;">${simPercent}%</span></td>
                        <td>
                            <button class="btn" style="padding: 6px 12px; font-size: 12px; margin-right: 5px; background: linear-gradient(135deg, #3498db, #2980b9);" 
                                onclick="harmonizePlayerName('${escName1}', '${escName2}', ${division})">
                                Utiliser "${pair.name2}"
                            </button>
                            <button class="btn" style="padding: 6px 12px; font-size: 12px; background: linear-gradient(135deg, #9b59b6, #8e44ad);" 
                                onclick="harmonizePlayerName('${escName2}', '${escName1}', ${division})">
                                Utiliser "${pair.name1}"
                            </button>
                        </td>
                    </tr>`;
            });
            
            html += `</tbody></table></div>`;
        }
        
        if (!hasDuplicates) {
            html = `<div class="empty-state">✅ Aucun doublon potentiel détecté entre les joueurs.</div>`;
        }
        
        content.innerHTML = html;
        document.getElementById('duplicatePlayersModal').style.display = 'flex';
    }
    window.showDuplicatePlayersModal = showDuplicatePlayersModal;

    function closeDuplicatePlayersModal() {
        document.getElementById('duplicatePlayersModal').style.display = 'none';
    }
    window.closeDuplicatePlayersModal = closeDuplicatePlayersModal;

    function harmonizePlayerName(oldName, newName, division) {
        if (oldName === newName) return;
        if (!confirm(`Harmoniser "${oldName}" en "${newName}" dans toutes les journées et tous les matchs de la Division ${division} ?`)) {
            return;
        }
        editPlayerName(oldName, newName, division);
        showDuplicatePlayersModal(); // Rafraîchir la modal
    }
    window.harmonizePlayerName = harmonizePlayerName;

    console.log("=== SCRIPT CHARGÉ AVEC SUCCÈS ===");
    
} catch (error) {

    console.error("❌ ERREUR DANS LE SCRIPT:", error);
    console.error("Stack trace:", error.stack);
}

// ========================================
// GESTION PWA - SERVICE WORKER & INSTALLATION
// ========================================

let deferredPrompt = null;

// Enregistrement du Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('✅ Service Worker enregistré:', registration.scope);
            })
            .catch((error) => {
                console.log('❌ Échec enregistrement Service Worker:', error);
            });
    });
}

// Capture de l'événement beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
    // Empêche le mini-infobar de Chrome sur mobile
    e.preventDefault();
    // Stocke l'événement pour l'utiliser plus tard
    deferredPrompt = e;
    console.log('✅ Événement beforeinstallprompt capturé');

    // Vérifie si l'utilisateur a déjà refusé ou installé
    const pwaPromptDismissed = localStorage.getItem('pwaPromptDismissed');
    const pwaInstalled = localStorage.getItem('pwaInstalled');

    // Si l'utilisateur n'a pas encore répondu, affiche la modal après 2 secondes
    if (!pwaPromptDismissed && !pwaInstalled) {
        setTimeout(() => {
            showPwaInstallModal();
        }, 2000);
    }
});

// Fonction pour afficher la modal d'installation PWA
function showPwaInstallModal() {
    const modal = document.getElementById('pwaInstallModal');
    if (modal && deferredPrompt) {
        modal.style.display = 'block';
    }
}

// Fonction pour fermer la modal PWA
function closePwaInstallModal() {
    const modal = document.getElementById('pwaInstallModal');
    if (modal) {
        modal.style.display = 'none';
        // Stocke que l'utilisateur a fermé la modal
        localStorage.setItem('pwaPromptDismissed', 'true');
    }
}

// Fonction pour installer la PWA
async function installPwa() {
    if (!deferredPrompt) {
        console.log('❌ Pas de prompt d\'installation disponible');
        showNotification('Installation non disponible sur cet appareil', 'warning');
        closePwaInstallModal();
        return;
    }

    // Affiche le prompt d'installation natif
    deferredPrompt.prompt();

    // Attend la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
        console.log('✅ L\'utilisateur a accepté l\'installation');
        localStorage.setItem('pwaInstalled', 'true');
        showNotification('Application installée avec succès !', 'success');
    } else {
        console.log('❌ L\'utilisateur a refusé l\'installation');
        localStorage.setItem('pwaPromptDismissed', 'true');
    }

    // Réinitialise le prompt
    deferredPrompt = null;

    // Ferme la modal
    closePwaInstallModal();
}

// Détecte si l'app est déjà installée
window.addEventListener('appinstalled', () => {
    console.log('✅ PWA installée avec succès');
    localStorage.setItem('pwaInstalled', 'true');
    deferredPrompt = null;
});

// Ferme la modal si on clique en dehors
window.addEventListener('click', (event) => {
    const modal = document.getElementById('pwaInstallModal');
    if (event.target === modal) {
        closePwaInstallModal();
    }
});
