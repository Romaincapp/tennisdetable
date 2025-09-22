<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

console.log("Script démarré");

try {
    // STRUCTURE DE DONNÉES CHAMPIONNAT
    let championship = {
        currentDay: 1,
        days: {
            1: {
                players: { 1: [], 2: [], 3: [] },
                matches: { 1: [], 2: [], 3: [] }
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
                container.innerHTML = players.map(player => 
                    `<div class="player-tag" onclick="showPlayerDetails(${dayNumber}, ${division}, '${player}')">
                        ${player}
                        <button class="remove-player" onclick="event.stopPropagation(); removePlayer(${dayNumber}, ${division}, '${player}')" title="Supprimer">×</button>
                    </div>`
                ).join('');
            }
        }
    }
    window.updatePlayersDisplay = updatePlayersDisplay;

    function removePlayer(dayNumber, division, playerName) {
        console.log("removePlayer appelée");
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

    // GESTION DES ONGLETS ET JOURNÉES
    function addNewDay() {
        const existingDays = Object.keys(championship.days).map(Number);
        const newDayNumber = Math.max(...existingDays) + 1;
        
        championship.days[newDayNumber] = {
            players: { 1: [], 2: [], 3: [] },
            matches: { 1: [], 2: [], 3: [] }
        };
        
        createDayTab(newDayNumber);
        createDayContent(newDayNumber);
        updateDaySelectors();
        updateTabsDisplay();
        switchTab(newDayNumber);
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
            delete championship.days[dayNumber];
            
            const tab = document.querySelector(`[data-day="${dayNumber}"]`);
            if (tab) tab.remove();
            
            const dayContent = document.getElementById(`day-${dayNumber}`);
            if (dayContent) dayContent.remove();
            
            const remainingDays = Object.keys(championship.days).map(Number);
            switchTab(Math.min(...remainingDays));
            
            updateDaySelectors();
            saveToLocalStorage();
            showNotification(`Journée ${dayNumber} supprimée`, 'warning');
        }
    }
    window.removeDay = removeDay;

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
        });
    }

    // GÉNÉRATION DES MATCHS
    function generateMatchesForDay(dayNumber) {
        if (!dayNumber) {
            dayNumber = championship.currentDay;
        }
        
        const dayData = championship.days[dayNumber];
        if (!dayData) return;
        
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
                        
                        html += `
                            <div class="match ${matchStatus}" data-match-id="d${dayNumber}-div${division}-m${globalIndex}">
                                <div class="match-header">
                                    <div class="player-names">${match.player1} VS ${match.player2}</div>
                                    <div class="match-status ${statusClass}">${statusText}</div>
                                </div>
                                <div class="sets-container">
                        `;
                        
                        for (let setIndex = 0; setIndex < 3; setIndex++) {
                            let setClass = 'set';
                            let setDisabled = '';
                            
                            if (match.completed && setIndex === 2) {
                                let player1Sets = 0;
                                let player2Sets = 0;
                                
                                for (let i = 0; i < 2; i++) {
                                    if (match.sets[i] && match.sets[i].player1Score !== '' && match.sets[i].player2Score !== '') {
                                        const score1 = parseInt(match.sets[i].player1Score);
                                        const score2 = parseInt(match.sets[i].player2Score);
                                        
                                        if (score1 > score2) {
                                            player1Sets++;
                                        } else if (score2 > score1) {
                                            player2Sets++;
                                        }
                                    }
                                }
                                
                                if (player1Sets >= 2 || player2Sets >= 2) {
                                    setClass += ' set-disabled';
                                    setDisabled = 'disabled';
                                }
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
                                <div class="match-result ${resultClass}">
                                    ${resultText}
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
        championship.days[dayNumber].matches[division][matchIndex].sets[setIndex][scoreField] = value;
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
        
        if (!matchElement) return;
        
        const statusElement = matchElement.querySelector('.match-status');
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
        
        const resultElement = matchElement.querySelector('.match-result');
        if (resultElement) {
            let resultText = 'En attente des résultats';
            let resultClass = 'result-pending';
            
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
                
                resultText = `🏆 ${match.winner} remporte le match (${winnerSets}-${loserSets})`;
                resultClass = 'result-completed';
            }
            
            resultElement.className = `match-result ${resultClass}`;
            resultElement.textContent = resultText;
        }
        
        if (match.completed) {
            const set3Inputs = matchElement.querySelectorAll('.set:nth-child(3) .score-input');
            set3Inputs.forEach(input => {
                input.disabled = true;
                input.parentElement.parentElement.classList.add('set-disabled');
            });
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
                
                if (score1 > score2) {
                    player1Sets++;
                } else if (score2 > score1) {
                    player2Sets++;
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
                <h3>🥇 Division 1</h3>
                <div class="players-list" id="division${dayNumber}-1-players">
                    <div class="empty-state">Aucun joueur</div>
                </div>
                <div class="matches-container" id="division${dayNumber}-1-matches"></div>
            </div>
            
            <div class="division division-2">
                <h3>🥈 Division 2</h3>
                <div class="players-list" id="division${dayNumber}-2-players">
                    <div class="empty-state">Aucun joueur</div>
                </div>
                <div class="matches-container" id="division${dayNumber}-2-matches"></div>
            </div>
            
            <div class="division division-3">
                <h3>🥉 Division 3</h3>
                <div class="players-list" id="division${dayNumber}-3-players">
                    <div class="empty-state">Aucun joueur</div>
                </div>
                <div class="matches-container" id="division${dayNumber}-3-matches"></div>
            </div>
        `;
    }

    // STATISTIQUES ET CLASSEMENTS
    function calculatePlayerStats(dayNumber, division, playerName) {
        const dayData = championship.days[dayNumber];
        if (!dayData) return null;
        
        const playerMatches = dayData.matches[division].filter(match => 
            match.player1 === playerName || match.player2 === playerName
        );
        
        let wins = 0;
        let losses = 0;
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
                    wins++;
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
        const totalPoints = wins * 3 + losses * 1;
        
        return {
            matchesPlayed,
            wins,
            losses,
            setsWon,
            setsLost,
            pointsWon,
            pointsLost,
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
            
            const playerStats = dayData.players[division].map(player => ({
                name: player,
                ...calculatePlayerStats(dayNumber, division, player)
            }));
            
            if (sortBy === 'points') {
                playerStats.sort((a, b) => {
                    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
                    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
                    return b.setsWon - a.setsWon;
                });
            } else {
                playerStats.sort((a, b) => {
                    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
                    if (b.wins !== a.wins) return b.wins - a.wins;
                    return b.setsWon - a.setsWon;
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
                                <th>Sets</th>
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
                                <th>V/D Global</th>
                                <th>% Vict. Moy.</th>
                                <th>Sets Global</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            generalRanking.divisions[division].forEach((player, index) => {
                const rankClass = index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : '';
                
                rankingHtml += `
                    <tr style="cursor: pointer;" onclick="showGeneralPlayerDetails('${player.name}', ${division})">
                        <td class="rank-position ${rankClass}">${index + 1}</td>
                        <td style="font-weight: 600;">${player.name}</td>
                        <td class="stat-value">${player.totalPoints}</td>
                        <td>${player.daysPlayed}</td>
                        <td>${player.totalWins}/${player.totalLosses}</td>
                        <td>${player.avgWinRate}%</td>
                        <td>${player.totalSetsWon}/${player.totalSetsLost}</td>
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
                divPlayers.forEach(player => totalPlayers.add(player));
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
                    if (!playersData[playerName]) {
                        playersData[playerName] = {
                            name: playerName,
                            daysPlayed: 0,
                            totalPoints: 0,
                            totalWins: 0,
                            totalLosses: 0,
                            totalSetsWon: 0,
                            totalSetsLost: 0,
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
                        playersData[playerName].totalSetsWon += dayStats.setsWon;
                        playersData[playerName].totalSetsLost += dayStats.setsLost;
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
                        Math.round(player.winRates.reduce((a, b) => a + b, 0) / player.winRates.length) : 0
                }))
                .sort((a, b) => {
                    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
                    if (b.avgWinRate !== a.avgWinRate) return b.avgWinRate - a.avgWinRate;
                    return b.totalSetsWon - a.totalSetsWon;
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
            totalSetsWon: acc.totalSetsWon + day.setsWon,
            totalSetsLost: acc.totalSetsLost + day.setsLost,
            totalMatchesPlayed: acc.totalMatchesPlayed + day.matchesPlayed
        }), {
            totalPoints: 0,
            totalWins: 0,
            totalLosses: 0,
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
                    <div class="overview-number">${totals.totalWins}/${totals.totalLosses}</div>
                    <div class="overview-label">V/D Global</div>
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
                            ${dayStats.wins}V/${dayStats.losses}D - ${dayStats.matchesPlayed} matchs
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

    if (typeof window.jsPDF === 'undefined') {
        console.error("jsPDF n'est pas chargé correctement");
        alert("jsPDF n'est pas chargé correctement. Veuillez vérifier la console pour plus de détails.");
        return;
    }
    console.log("jsPDF est chargé correctement");

    const generalRanking = calculateGeneralRanking();
    console.log("Classement général calculé:", generalRanking);

    const generalStats = calculateGeneralStats();
    console.log("Statistiques générales calculées:", generalStats);

    if (!generalRanking.hasData) {
        console.log("Aucun classement général disponible pour l'export PDF");
        alert('Aucun classement général disponible pour l\'export PDF');
        return;
    }

    console.log("Création d'une nouvelle instance de jsPDF");
    const doc = new window.jsPDF();

    // Configuration
    const pageWidth = doc.internal.pageSize.width;
    const marginLeft = 15;
    const marginRight = 15;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let yPosition = 20;

    console.log("Configuration de la page terminée");

    // HEADER
    console.log("Ajout de l'en-tête");
    doc.setFontSize(20);
    doc.setTextColor(52, 73, 94); // Bleu foncé
    doc.text('🏆 CLASSEMENT GÉNÉRAL DU CHAMPIONNAT', pageWidth/2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFontSize(12);
    doc.setTextColor(127, 140, 141); // Gris
    const currentDate = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Généré le ${currentDate}`, pageWidth/2, yPosition, { align: 'center' });

    // STATISTIQUES GÉNÉRALES
    console.log("Ajout des statistiques générales");
    yPosition += 20;
    doc.setFontSize(14);
    doc.setTextColor(52, 73, 94);
    doc.text('📊 STATISTIQUES DU CHAMPIONNAT', marginLeft, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(44, 62, 80);
    const statsText = [
        `• ${generalStats.totalDays} journées disputées`,
        `• ${generalStats.totalPlayers} joueurs uniques`,
        `• ${generalStats.totalMatches} matchs programmés`,
        `• ${generalStats.completedMatches} matchs terminés`
    ];
    statsText.forEach(stat => {
        doc.text(stat, marginLeft + 5, yPosition);
        yPosition += 6;
    });

    // CLASSEMENTS PAR DIVISION
    console.log("Ajout des classements par division");
    yPosition += 10;
    for (let division = 1; division <= 3; division++) {
        if (generalRanking.divisions[division].length === 0) continue;

        // Titre de division
        const divisionIcon = division === 1 ? '🥇' : division === 2 ? '🥈' : '🥉';
        doc.setFontSize(12);
        doc.setTextColor(230, 126, 34); // Orange
        doc.text(`${divisionIcon} DIVISION ${division}`, marginLeft, yPosition);
        yPosition += 8;

        // En-têtes du tableau
        doc.setFontSize(9);
        doc.setTextColor(52, 73, 94);
        const headers = ['Rang', 'Joueur', 'Points', 'Journées', 'V/D', '% Vict.', 'Sets'];
        const colWidths = [15, 50, 18, 20, 20, 18, 25];
        let xPos = marginLeft;
        headers.forEach((header, i) => {
            doc.text(header, xPos, yPosition);
            xPos += colWidths[i];
        });
        yPosition += 2;

        // Ligne de séparation
        doc.setDrawColor(189, 195, 199);
        doc.line(marginLeft, yPosition, marginLeft + contentWidth, yPosition);
        yPosition += 5;

        // Données des joueurs
        doc.setFontSize(8);
        doc.setTextColor(44, 62, 80);
        generalRanking.divisions[division].forEach((player, index) => {
            if (yPosition > 270) { // Nouvelle page si nécessaire
                doc.addPage();
                yPosition = 20;
            }
            xPos = marginLeft;
            const rank = `${index + 1}`;
            const name = player.name.length > 20 ? player.name.substring(0, 17) + '...' : player.name;
            const points = `${player.totalPoints}`;
            const days = `${player.daysPlayed}`;
            const victories = `${player.totalWins}/${player.totalLosses}`;
            const winRate = `${player.avgWinRate}%`;
            const sets = `${player.totalSetsWon}/${player.totalSetsLost}`;
            const rowData = [rank, name, points, days, victories, winRate, sets];

            // Couleur de fond pour le podium
            if (index < 3) {
                const colors = [
                    [255, 215, 0, 0.3], // Or
                    [192, 192, 192, 0.3], // Argent
                    [205, 127, 50, 0.3]  // Bronze
                ];
                doc.setFillColor(...colors[index]);
                doc.rect(marginLeft - 2, yPosition - 3, contentWidth + 4, 6, 'F');
            }

            rowData.forEach((data, i) => {
                if (i === 0 && index < 3) { // Rang avec médaille
                    doc.setTextColor(184, 134, 11); // Or foncé
                    doc.setFont(undefined, 'bold');
                } else {
                    doc.setTextColor(44, 62, 80);
                    doc.setFont(undefined, 'normal');
                }
                doc.text(data, xPos, yPosition);
                xPos += colWidths[i];
            });
            yPosition += 6;
        });
        yPosition += 10;
    }

    // FOOTER
    console.log("Ajout du pied de page");
    if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
    }
    yPosition = 280;
    doc.setFontSize(8);
    doc.setTextColor(149, 165, 166);
    doc.text('Championnat Tennis de Table - Gestion Esenca Sport', pageWidth/2, yPosition, { align: 'center' });
    doc.text(`Système de points: Victoire = 3pts, Défaite = 1pt`, pageWidth/2, yPosition + 4, { align: 'center' });

    // Sauvegarde
    console.log("Sauvegarde du PDF");
    const fileName = `Classement_General_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(fileName);
    console.log("PDF sauvegardé avec le nom:", fileName);

    showNotification('Classement général exporté en PDF !', 'success');
    console.log("Fin de la fonction exportGeneralRankingToPDF");
}

window.exportGeneralRanking = exportGeneralRanking;
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
                            matches: { 1: [], 2: [], 3: [] }
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
        
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeBulkModal();
                closePlayerModal();
                closeImportModal();
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
    }

    // INITIALISATION AU CHARGEMENT
    document.addEventListener('DOMContentLoaded', function() {
        console.log("DOM chargé, début initialisation");
        
        // Charger les données sauvegardées
        if (loadFromLocalStorage()) {
            updateTabsDisplay();
            updateDaySelectors();
            initializeAllDaysContent();
            switchTab(championship.currentDay);
        } else {
            initializeDivisionsDisplay(1);
            updatePlayersDisplay(1);
        }
        
        setupEventListeners();
        console.log("Initialisation terminée");
    });

    console.log("=== SCRIPT CHARGÉ AVEC SUCCÈS ===");
    
} catch (error) {
    console.error("❌ ERREUR DANS LE SCRIPT:", error);
    console.error("Stack trace:", error.stack);
}