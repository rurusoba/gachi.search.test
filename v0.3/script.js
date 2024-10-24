document.addEventListener('DOMContentLoaded', function() {
    // IndexedDBの設定
    let db;
    const request = indexedDB.open('GachiGachiDB', 5);

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        if (!db.objectStoreNames.contains('categoryMenus')) {
            db.createObjectStore('categoryMenus', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('favoritesMenus')) {
            db.createObjectStore('favoritesMenus', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('searchEngines')) {
            const searchEnginesStore = db.createObjectStore('searchEngines', { keyPath: 'id', autoIncrement: true });
            searchEnginesStore.createIndex('name', 'name', { unique: true });
        }
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        initializeApp();
    };

    request.onerror = function(event) {
        console.error('IndexedDBの初期化中にエラーが発生しました。', event);
    };

    // アプリの初期化
    function initializeApp() {

                // その他のアプリ初期化処理...

        // 検索履歴の管理
        let saveHistory = true;
        const saveHistoryCheckbox = document.getElementById('saveHistoryCheckbox');
        const searchHistoryDiv = document.getElementById('searchHistory');
        const historyList = document.getElementById('historyList');

        // 検索履歴を保存するかどうかのチェックボックスイベント
        saveHistoryCheckbox.addEventListener('change', function() {
            saveHistory = this.checked;
            if (!saveHistory) {
                clearSearchHistory();
                searchHistoryDiv.style.display = 'none';
            } else {
                searchHistoryDiv.style.display = 'block';
            }
        });

        // 検索履歴の初期化
        function clearSearchHistory() {
            historyList.innerHTML = '';
            localStorage.removeItem('searchHistory');
        }

        // 検索履歴の保存
        function saveSearchHistory(queryData) {
            if (saveHistory) {
                let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
                searchHistory.push(queryData);
                localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
                updateSearchHistoryUI();
            }
        }

        // 検索履歴の表示更新
        function updateSearchHistoryUI() {
            let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
            historyList.innerHTML = '';
    
            // 履歴を逆順にして新しい履歴が上に来るようにする
            searchHistory.reverse().forEach((historyItem, index) => {
               const historyDiv = document.createElement('div');
                historyDiv.classList.add('history-item');
                historyDiv.innerHTML = `
                ーーーーーーーーーーーーーーーーーーーーー<br>
             検索キーワード: ${historyItem.searchWord}<br>
                OR検索キーワード: ${historyItem.orSearchWord}<br>
               NOT検索キーワード: ${historyItem.notSearchWord}<br>
             サイト指定ドメイン一覧: ${historyItem.siteDomains.join(':')}<br>
                <button onclick="deleteHistoryItem(${index})">＞＞この検索履歴を削除＜＜</button><br>
                ーーーーーーーーーーーーーーーーーーーーー
                `;
                historyList.appendChild(historyDiv);
            });
        }

        // 個別履歴の削除
        window.deleteHistoryItem = function(index) {
            let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
            searchHistory.splice(index, 1);
            localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
            updateSearchHistoryUI();
        };

        // 検索フォームの送信イベントに履歴保存を追加
        document.getElementById('searchForm').addEventListener('submit', function(event) {
            event.preventDefault();
            const searchWord = document.getElementById('searchWord').value;
            const orSearchWord = document.getElementById('orSearchWords').value;
            const notSearchWord = document.getElementById('notSearchWord').value;
            const siteDomains = Array.from(document.querySelectorAll('input[name="site"]:checked')).map(input => input.value);
            
            const queryData = {
                searchWord,
                orSearchWord,
                notSearchWord,
                siteDomains
            };
            
            saveSearchHistory(queryData);
        });

        // 初期化時に履歴を読み込む
        updateSearchHistoryUI();

        
        // 変数や要素の取得
        const categoryMenuSelect = document.getElementById('categoryMenuSelect');
        const favoritesMenuSelect = document.getElementById('favoritesMenuSelect');
        const categoryDropdown = document.getElementById('categoryDropdown');
        const subCategoryCheckboxes = document.getElementById('subCategoryCheckboxes');
        const addButton = document.getElementById('addButton');
        const toggleDragButton = document.getElementById('toggleDragButton');
        let dragEnabled = false;

        // タブの切り替え
        const tabs = document.querySelectorAll('.tab');
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabs.forEach(tab => tab.classList.remove('active'));
                button.classList.add('active');
                document.getElementById(button.dataset.tab).classList.add('active');
            });
        });

        ///チェックボックスの処理
        document.getElementById('toggleDisplay').addEventListener('change', function() {
            const manageField = document.getElementById('manageInputField');
            if (this.checked) {
                manageField.style.display = 'block'; // チェックボックスがオンの場合表示
            } else {
                manageField.style.display = 'none'; // チェックボックスがオフの場合非表示
            }
        });

        // 検索エンジンの設定
        populateSearchEngines();

        // カテゴリメニューの読み込み
        populateCategoryMenus();
        populateFavoritesMenus();

        // お気に入りの読み込み
        loadFavorites();

        // イベントリスナーの設定
        toggleDragButton.addEventListener('click', function() {
            dragEnabled = !dragEnabled;
            toggleDragButton.textContent = dragEnabled ? 'ドラッグ＆ドロップを無効化' : 'ドラッグ＆ドロップを有効化';
            updateSubCategories();
        });

        document.getElementById('editCategoryButton').addEventListener('click', function() {
            getSelectedCategoryIndex().then(selectedCategoryIndex => {
                if (selectedCategoryIndex !== null) {
                    getCategory(selectedCategoryIndex).then(selectedCategory => {
                        const newCategoryName = prompt('カテゴリー名を変更:', selectedCategory.name);
                        if (newCategoryName) {
                            selectedCategory.name = newCategoryName;
                            updateCategory(selectedCategory).then(() => {
                                populateCategories();
                            });
                        }
                    });
                }
            });
        });

        addButton.addEventListener('click', function() {
            getSelectedCategoryIndex().then(selectedCategoryIndex => {
                if (selectedCategoryIndex === null) {
                    const categoryName = prompt('新しいカテゴリー名:');
                    if (categoryName) {
                        addCategory({ name: categoryName, subCategories: [] }).then(() => {
                            populateCategories();
                        });
                    }
                } else {
                    getCategory(selectedCategoryIndex).then(selectedCategory => {
                        const subCategoryName = prompt('新しいサブカテゴリー名:');
                        const subCategoryUrl = prompt('新しいサブカテゴリーのURL:', 'site:');
                        if (subCategoryName && subCategoryUrl) {
                            selectedCategory.subCategories.push({ name: subCategoryName, url: subCategoryUrl });
                            updateCategory(selectedCategory).then(() => {
                                updateSubCategories();
                            });
                        }
                    });
                }
            });
        });

        document.getElementById('deleteCategoryButton').addEventListener('click', function() {
            getSelectedCategoryIndex().then(selectedCategoryIndex => {
                if (selectedCategoryIndex !== null && confirm('このカテゴリーを削除しますか？')) {
                    deleteCategory(selectedCategoryIndex).then(() => {
                        populateCategories();
                    });
                }
            });
        });

        document.getElementById('exportSettingsButton').addEventListener('click', function() {
            exportCategories().then(categories => {
                const json = JSON.stringify(categories, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'settings.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        });

        document.getElementById('importSettingsButton').addEventListener('click', function() {
            document.getElementById('importInput').click();
        });

        // 設定のインポート
        document.getElementById('importInput').addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const importedData = JSON.parse(e.target.result);
                        if (Array.isArray(importedData) && importedData.every(category => category.name && Array.isArray(category.subCategories))) {
                            clearCategories().then(() => {
                                const selectedMenuId = categoryMenuSelect.value;
                                getCategoryMenu(selectedMenuId).then(menu => {
                                    // 各カテゴリにユニークなIDを付与
                                    importedData.forEach(category => {
                                        if (!category.id) {
                                            category.id = Date.now() + Math.random();
                                        }
                                    });
                                    menu.categories = importedData;
                                    updateCategoryMenu(menu).then(() => {
                                        alert('設定がインポートされました。');
                                        populateCategories();
                                    });
                                });
                            });
                        } else {
                            throw new Error('不正なフォーマット');
                        }
                    } catch (error) {
                        alert('ファイルの読み込み中にエラーが発生しました。正しいJSONファイルを選択してください。');
                    }
                };
                reader.readAsText(file);
            }
        });

        document.getElementById('searchForm').addEventListener('submit', function(event) {
event.preventDefault();

const searchWord = document.getElementById('searchWord').value.replace(/[\s　]/g, '+');

// OR検索キーワードの処理
const orSearchWordsArray = document.getElementById('orSearchWords').value.trim().split(/[\s　]+/).filter(word => word);
let orSearchPart = '';
if (orSearchWordsArray.length === 1) {
orSearchPart = '+OR+' + orSearchWordsArray[0];
} else if (orSearchWordsArray.length > 1) {
orSearchPart = '+OR+(' + orSearchWordsArray.join(' OR ') + ')';
}

// NOT検索キーワードの処理
const notSearchWordsArray = document.getElementById('notSearchWord').value.trim().split(/[\s　]+/).filter(word => word);

// アフィリエイト等のサイトを除外するチェックボックスの値を取得
const excludeAffiliateSites = document.getElementById('excludeAffiliateSites').checked;
if (excludeAffiliateSites) {
// 後で内容を記入するため、現在はサンプルとして'サンプル'を追加
notSearchWordsArray.push('プロモーション+アフィリエイト+広告+PR+注視+年齢+学歴+炎上+いかがでしたか');
}

let notSearchPart = '';
if (notSearchWordsArray.length === 1) {
notSearchPart = ' -' + notSearchWordsArray[0];
} else if (notSearchWordsArray.length > 1) {
notSearchPart = ' -(' + notSearchWordsArray.join('+') + ')';
}

// サイト指定の処理
const siteFilter = [];
const checkboxes = document.querySelectorAll('input[name="site"]:checked');
checkboxes.forEach(function(checkbox) {
siteFilter.push(checkbox.value);
});
let siteFilterPart = '';
if (siteFilter.length === 1) {
siteFilterPart = '+' + siteFilter[0];
} else if (siteFilter.length > 1) {
siteFilterPart = '+(' + siteFilter.join(' OR ') + ')';
}

const searchAfter = document.getElementById('searchAfter').value;
const afterFilter = searchAfter ? `+after:${searchAfter}` : '';

const searchBefore = document.getElementById('searchBefore').value;
const beforeFilter = searchBefore ? `+before:${searchBefore}` : '';

const searchEngine = document.getElementById('searchEngine').value;

const searchQuery = `${searchWord}${orSearchPart}${notSearchPart}${siteFilterPart}${afterFilter}${beforeFilter}`;
let searchUrl = searchEngine.replace('{query}', encodeURIComponent(searchQuery));

window.open(searchUrl, '_blank');
});
        document.getElementById('createCategoryMenuButton').addEventListener('click', function() {
            const menuName = prompt('新しいカテゴリメニュー名:');
            if (menuName) {
                addCategoryMenu({ name: menuName, categories: [] }).then(() => {
                    populateCategoryMenus();
                });
            }
        });

        document.getElementById('deleteCategoryMenuButton').addEventListener('click', function() {
            const selectedMenuId = categoryMenuSelect.value;
            if (selectedMenuId && confirm('このカテゴリメニューを削除しますか？')) {
                deleteCategoryMenu(selectedMenuId).then(() => {
                    populateCategoryMenus();
                });
            }
        });

        document.getElementById('createFavoritesMenuButton').addEventListener('click', function() {
            const menuName = prompt('新しいカテゴリメニュー名:');
            if (menuName) {
                addFavoritesMenu({ name: menuName, favorites: [] }).then(() => {
                    populateFavoritesMenus();
                });
            }
        });

        document.getElementById('deleteFavoritesMenuButton').addEventListener('click', function() {
            const selectedMenuId = favoritesMenuSelect.value;
            if (selectedMenuId && confirm('このカテゴリメニューを削除しますか？')) {
                deleteFavoritesMenu(selectedMenuId).then(() => {
                    populateFavoritesMenus();
                });
            }
        });

        // お気に入りのインポート/エクスポート機能
        document.getElementById('exportFavoritesButton').addEventListener('click', function() {
            exportFavorites().then(favorites => {
                const json = JSON.stringify(favorites, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'favorites.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        });

        document.getElementById('importFavoritesButton').addEventListener('click', function() {
            document.getElementById('importFavoritesInput').click();
        });

        // お気に入りのインポート
        document.getElementById('importFavoritesInput').addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const importedData = JSON.parse(e.target.result);
                        if (Array.isArray(importedData) && importedData.every(fav => fav.name && fav.url)) {
                            clearFavorites().then(() => {
                                const selectedMenuId = favoritesMenuSelect.value;
                                getFavoritesMenu(selectedMenuId).then(menu => {
                                    // 各お気に入りにユニークなIDを付与
                                    importedData.forEach(favorite => {
                                        if (!favorite.id) {
                                            favorite.id = Date.now() + Math.random();
                                        }
                                        if (!favorite.icon) {
                                            favorite.icon = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(favorite.url)}`;
                                        }
                                    });
                                    menu.favorites = importedData;
                                    updateFavoritesMenu(menu).then(() => {
                                        alert('お気に入りがインポートされました。');
                                        loadFavorites();
                                    });
                                });
                            });
                        } else {
                            throw new Error('不正なフォーマット');
                        }
                    } catch (error) {
                        alert('ファイルの読み込み中にエラーが発生しました。正しいJSONファイルを選択してください。');
                    }
                };
                reader.readAsText(file);
            }
        });

        document.getElementById('addFavoriteButton').addEventListener('click', function() {
            const favoriteName = prompt('お気に入りの名前:');
            const favoriteUrl = prompt('お気に入りのURL:', 'https://');
            if (favoriteName && favoriteUrl) {
                const iconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(favoriteUrl)}`;
                addFavorite({ name: favoriteName, url: favoriteUrl, icon: iconUrl }).then(() => {
                    loadFavorites();
                });
            }
        });

        // IndexedDB関連の関数
        // 以下、省略せずにすべての関数を記述します。

        // カテゴリメニュー関連の関数
        function getCategoryMenu(id) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['categoryMenus'], 'readonly');
                const store = transaction.objectStore('categoryMenus');
                const request = store.get(Number(id));
                request.onsuccess = function(event) {
                    resolve(event.target.result);
                };
                request.onerror = function(event) {
                    reject(event);
                };
            });
        }

        function addCategoryMenu(menu) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['categoryMenus'], 'readwrite');
                const store = transaction.objectStore('categoryMenus');
                const request = store.add(menu);
                request.onsuccess = function() {
                    resolve();
                };
                request.onerror = function(event) {
                    reject(event);
                };
            });
        }

        function deleteCategoryMenu(id) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['categoryMenus'], 'readwrite');
                const store = transaction.objectStore('categoryMenus');
                const request = store.delete(Number(id));
                request.onsuccess = function() {
                    resolve();
                };
                request.onerror = function(event) {
                    reject(event);
                };
            });
        }

        function getAllCategoryMenus() {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['categoryMenus'], 'readonly');
                const store = transaction.objectStore('categoryMenus');
                const request = store.getAll();
                request.onsuccess = function(event) {
                    resolve(event.target.result);
                };
                request.onerror = function(event) {
                    reject(event);
                };
            });
        }

        function populateCategoryMenus() {
            getAllCategoryMenus().then(menus => {
                categoryMenuSelect.innerHTML = '';
                if (menus.length === 0) {
                    // 初期値として「総合」を作成
                    addCategoryMenu({ name: '総合', categories: [] }).then(() => {
                        populateCategoryMenus();
                    });
                    return;
                }
                menus.forEach(menu => {
                    const option = document.createElement('option');
                    option.value = menu.id;
                    option.textContent = menu.name;
                    categoryMenuSelect.appendChild(option);
                });
                categoryMenuSelect.value = menus[0].id;
                populateCategories();
                categoryMenuSelect.addEventListener('change', populateCategories);
            });
        }

        function populateCategories() {
            const selectedMenuId = categoryMenuSelect.value;
            if (!selectedMenuId) return;

            getCategoryMenu(selectedMenuId).then(menu => {
                const categories = menu.categories || [];
                if (categories.length === 0) {
                    // デフォルトのカテゴリを追加
                    const defaultCategories = [
                        {
                            id: Date.now(),
                            name: 'ニュース',
                            subCategories: [
                                { name: 'NHK', url: 'site:nhk.or.jp' },
                                { name: '読売新聞', url: 'site:yomiuri.co.jp' },
                                { name: '朝日新聞', url: 'site:asahi.com' },
                                { name: '毎日新聞', url: 'site:mainichi.jp' },
                                { name: '日本経済新聞', url: 'site:nikkei.com' },
                                { name: 'CNN', url: 'site:cnn.co.jp' },
                                { name: 'BBC', url: 'site:bbc.com/japanese' },
                                { name: 'Yahoo', url: 'site:news.yahoo.com' }
                            ]
                        },
                        // 他のデフォルトカテゴリを追加できます
                    ];
                    menu.categories = defaultCategories;
                    updateCategoryMenu(menu).then(() => {
                        populateCategories();
                    });
                    return;
                }

                categoryDropdown.innerHTML = '';
                categories.forEach(function(category) {
                    const label = document.createElement('label');
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = category.id;
                    checkbox.addEventListener('change', function() {
                        updateSubCategories();
                        updateAddButtonLabel();
                    });
                    label.appendChild(checkbox);
                    label.appendChild(document.createTextNode(` ${category.name}`));
                    categoryDropdown.appendChild(label);
                });
                updateSubCategories();
                updateAddButtonLabel();
            });
        }

        function updateCategoryMenu(menu) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['categoryMenus'], 'readwrite');
                const store = transaction.objectStore('categoryMenus');
                const request = store.put(menu);
                request.onsuccess = function() {
                    resolve();
                };
                request.onerror = function(event) {
                    reject(event);
                };
            });
        }

        function getCategory(id) {
            const selectedMenuId = categoryMenuSelect.value;
            return getCategoryMenu(selectedMenuId).then(menu => {
                return menu.categories.find(cat => cat.id == id);
            });
        }

        function updateCategory(category) {
            const selectedMenuId = categoryMenuSelect.value;
            return getCategoryMenu(selectedMenuId).then(menu => {
                const index = menu.categories.findIndex(cat => cat.id == category.id);
                if (index !== -1) {
                    menu.categories[index] = category;
                    return updateCategoryMenu(menu);
                }
            });
        }

        function addCategory(category) {
            const selectedMenuId = categoryMenuSelect.value;
            return getCategoryMenu(selectedMenuId).then(menu => {
                if (!category.id) {
                    category.id = Date.now();
                }
                menu.categories.push(category);
                return updateCategoryMenu(menu);
            });
        }

        function deleteCategory(id) {
            const selectedMenuId = categoryMenuSelect.value;
            return getCategoryMenu(selectedMenuId).then(menu => {
                const index = menu.categories.findIndex(cat => cat.id == id);
                if (index !== -1) {
                    menu.categories.splice(index, 1);
                    return updateCategoryMenu(menu);
                }
            });
        }

        function updateSubCategories() {
            subCategoryCheckboxes.innerHTML = '';
            const selectedMenuId = categoryMenuSelect.value;
            if (!selectedMenuId) return;

            getCategoryMenu(selectedMenuId).then(menu => {
                const categories = menu.categories || [];
                const selectedCategoryCheckboxes = document.querySelectorAll('#categoryDropdown input:checked');
                const selectedCategories = Array.from(selectedCategoryCheckboxes).map(checkbox => {
                    return categories.find(cat => cat.id == checkbox.value);
                });

                selectedCategories.forEach(function(category) {
                    category.subCategories.forEach(function(subCategory, subIndex) {
                        const label = document.createElement('label');
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.name = 'site';
                        checkbox.value = subCategory.url;
                        if (dragEnabled) {
                            label.classList.add('draggable');
                        }
                        label.appendChild(checkbox);
                        label.appendChild(document.createTextNode(` ${subCategory.name}`));

                        const editButton = document.createElement('button');
                        editButton.type = 'button';
                        editButton.className = 'edit-button';
                        editButton.textContent = '編集';
                        editButton.addEventListener('click', function() {
                            const newSubCategoryName = prompt('サブカテゴリー名を変更:', subCategory.name);
                            const newSubCategoryUrl = prompt('URLを変更:', subCategory.url);
                            if (newSubCategoryName && newSubCategoryUrl) {
                                subCategory.name = newSubCategoryName;
                                subCategory.url = newSubCategoryUrl;
                                updateCategoryInMenu(menu, category).then(() => {
                                    updateSubCategories();
                                });
                            }
                        });
                        label.appendChild(editButton);

                        const deleteButton = document.createElement('button');
                        deleteButton.type = 'button';
                        deleteButton.className = 'delete-button';
                        deleteButton.textContent = '削除';
                        deleteButton.addEventListener('click', function() {
                            if (confirm(`サブカテゴリー「${subCategory.name}」を削除しますか？`)) {
                                category.subCategories.splice(subIndex, 1);
                                updateCategoryInMenu(menu, category).then(() => {
                                    updateSubCategories();
                                });
                            }
                        });
                        label.appendChild(deleteButton);

                        subCategoryCheckboxes.appendChild(label);
                    });
                });

                if (dragEnabled) {
                    initializeDragAndDrop();
                }
            });
        }

        function updateAddButtonLabel() {
            const selectedCategories = document.querySelectorAll('#categoryDropdown input:checked');
            if (selectedCategories.length === 0) {
                addButton.textContent = 'カテゴリーを追加';
            } else {
                addButton.textContent = 'サイトを追加';
            }
        }

        function initializeDragAndDrop() {
            const draggables = document.querySelectorAll('.draggable');
            draggables.forEach(function(draggable) {
                draggable.setAttribute('draggable', true);

                draggable.addEventListener('dragstart', function(e) {
                    e.dataTransfer.setData('text/plain', e.target.innerHTML);
                    e.target.classList.add('dragging');
                });

                draggable.addEventListener('dragover', function(e) {
                    e.preventDefault();
                });

                draggable.addEventListener('drop', function(e) {
                    e.preventDefault();
                    const draggingItem = document.querySelector('.dragging');
                    if (e.target.closest('.draggable') && draggingItem !== e.target.closest('.draggable')) {
                        e.target.closest('.draggable').insertAdjacentElement('beforebegin', draggingItem);
                        draggingItem.classList.remove('dragging');
                        saveSubCategoryOrder();
                    }
                });

                draggable.addEventListener('dragend', function() {
                    draggables.forEach(function(draggable) {
                        draggable.classList.remove('dragging');
                    });
                });
            });
        }

        function saveSubCategoryOrder() {
            const selectedMenuId = categoryMenuSelect.value;
            if (!selectedMenuId) return;

            getCategoryMenu(selectedMenuId).then(menu => {
                const categories = menu.categories || [];
                const selectedCategoryCheckboxes = document.querySelectorAll('#categoryDropdown input:checked');
                const selectedCategories = Array.from(selectedCategoryCheckboxes).map(checkbox => {
                    return categories.find(cat => cat.id == checkbox.value);
                });

                selectedCategories.forEach(function(category) {
                    const newOrder = [];
                    document.querySelectorAll('#subCategoryCheckboxes .draggable').forEach(function(label) {
                        const subCategory = category.subCategories.find(function(sub) {
                            return sub.url === label.querySelector('input[name="site"]').value;
                        });
                        if (subCategory) {
                            newOrder.push(subCategory);
                        }
                    });
                    category.subCategories = newOrder;
                    updateCategoryInMenu(menu, category);
                });
            });
        }

        function updateCategoryInMenu(menu, category) {
            const index = menu.categories.findIndex(cat => cat.id == category.id);
            if (index !== -1) {
                menu.categories[index] = category;
                return updateCategoryMenu(menu);
            }
        }

        function getSelectedCategoryIndex() {
            return new Promise((resolve) => {
                const checkedBoxes = document.querySelectorAll('#categoryDropdown input:checked');
                if (checkedBoxes.length === 1) {
                    resolve(checkedBoxes[0].value);
                } else if (checkedBoxes.length === 0) {
                    resolve(null);
                } else {
                    alert('カテゴリを一つだけ選択してください。');
                    resolve(null);
                }
            });
        }

        // カテゴリのインポート/エクスポート
        function exportCategories() {
            const selectedMenuId = categoryMenuSelect.value;
            return getCategoryMenu(selectedMenuId).then(menu => menu.categories || []);
        }

        function clearCategories() {
            const selectedMenuId = categoryMenuSelect.value;
            return getCategoryMenu(selectedMenuId).then(menu => {
                menu.categories = [];
                return updateCategoryMenu(menu);
            });
        }

        // お気に入り関連の関数
        function loadFavorites() {
            const selectedMenuId = favoritesMenuSelect.value;
            if (!selectedMenuId) return;

            getFavoritesMenu(selectedMenuId).then(menu => {
                const favorites = menu.favorites || [];
                if (favorites.length === 0) {
                    // 初期値としてYouTubeを追加
                    const defaultFavorite = {
                        id: Date.now(),
                        name: 'YouTube',
                        url: 'https://www.youtube.com/',
                        icon: `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent('https://www.youtube.com/')}`
                    };
                    menu.favorites.push(defaultFavorite);
                    updateFavoritesMenu(menu).then(() => {
                        loadFavorites();
                    });
                    return;
                }

                const favoritesContainer = document.getElementById('favoritesContainer');
                const favoritesContainerPC = document.getElementById('favoritesContainerPC');
                favoritesContainer.innerHTML = '';
                favoritesContainerPC.innerHTML = '';
                favorites.forEach(favorite => {
                    const item = createFavoriteItem(favorite);
                    const itemPC = createFavoriteItem(favorite);
                    favoritesContainer.appendChild(item);
                    favoritesContainerPC.appendChild(itemPC);
                });
            });
        }

        function getFavoritesMenu(id) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['favoritesMenus'], 'readonly');
                const store = transaction.objectStore('favoritesMenus');
                const request = store.get(Number(id));
                request.onsuccess = function(event) {
                    resolve(event.target.result);
                };
                request.onerror = function(event) {
                    reject(event);
                };
            });
        }

        function addFavoritesMenu(menu) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['favoritesMenus'], 'readwrite');
                const store = transaction.objectStore('favoritesMenus');
                const request = store.add(menu);
                request.onsuccess = function() {
                    resolve();
                };
                request.onerror = function(event) {
                    reject(event);
                };
            });
        }

        function deleteFavoritesMenu(id) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['favoritesMenus'], 'readwrite');
                const store = transaction.objectStore('favoritesMenus');
                const request = store.delete(Number(id));
                request.onsuccess = function() {
                    resolve();
                };
                request.onerror = function(event) {
                    reject(event);
                };
            });
        }

        function getAllFavoritesMenus() {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['favoritesMenus'], 'readonly');
                const store = transaction.objectStore('favoritesMenus');
                const request = store.getAll();
                request.onsuccess = function(event) {
                    resolve(event.target.result);
                };
                request.onerror = function(event) {
                    reject(event);
                };
            });
        }

        function populateFavoritesMenus() {
            getAllFavoritesMenus().then(menus => {
                favoritesMenuSelect.innerHTML = '';
                if (menus.length === 0) {
                    // 初期値として「総合」を作成
                    addFavoritesMenu({ name: '総合', favorites: [] }).then(() => {
                        populateFavoritesMenus();
                    });
                    return;
                }
                menus.forEach(menu => {
                    const option = document.createElement('option');
                    option.value = menu.id;
                    option.textContent = menu.name;
                    favoritesMenuSelect.appendChild(option);
                });
                favoritesMenuSelect.value = menus[0].id;
                loadFavorites();
                favoritesMenuSelect.addEventListener('change', loadFavorites);
            });
        }

        function updateFavoritesMenu(menu) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['favoritesMenus'], 'readwrite');
                const store = transaction.objectStore('favoritesMenus');
                const request = store.put(menu);
                request.onsuccess = function() {
                    resolve();
                };
                request.onerror = function(event) {
                    reject(event);
                };
            });
        }

        function createFavoriteItem(favorite) {
            const item = document.createElement('div');
            item.className = 'favorite-item';

            const img = document.createElement('img');
            img.src = favorite.icon;
            img.alt = favorite.name;
            img.addEventListener('click', () => {
                let url = favorite.url;
                // URLがhttp://もしくはhttps://で始まっていない場合、https://を追加
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                }
window.open(url, '_blank'); // URLを新しいタブで開く
            });
            item.appendChild(img);

            const nameSpan = document.createElement('span');
            nameSpan.textContent = favorite.name;
            item.appendChild(nameSpan);

            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.className = 'edit-button fav-button';
            editButton.textContent = '編集';
            editButton.addEventListener('click', () => {
                const newName = prompt('名前を変更:', favorite.name);
                const newUrl = prompt('URLを変更:', favorite.url);
                if (newName && newUrl) {
                    favorite.name = newName;
                    favorite.url = newUrl;
                    favorite.icon = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(newUrl)}`;
                    updateFavorite(favorite).then(() => {
                        loadFavorites();
                    });
                }
            });
            item.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'delete-button fav-button';
            deleteButton.textContent = '削除';
            deleteButton.addEventListener('click', () => {
                if (confirm(`お気に入り「${favorite.name}」を削除しますか？`)) {
                    deleteFavorite(favorite.id).then(() => {
                        loadFavorites();
                    });
                }
            });
            item.appendChild(deleteButton);

            return item;
        }

        function addFavorite(favorite) {
            const selectedMenuId = favoritesMenuSelect.value;
            return getFavoritesMenu(selectedMenuId).then(menu => {
                if (!favorite.id) {
                    favorite.id = Date.now();
                }
                menu.favorites.push(favorite);
                return updateFavoritesMenu(menu);
            });
        }

        function updateFavorite(favorite) {
            const selectedMenuId = favoritesMenuSelect.value;
            return getFavoritesMenu(selectedMenuId).then(menu => {
                const index = menu.favorites.findIndex(fav => fav.id == favorite.id);
                if (index !== -1) {
                    menu.favorites[index] = favorite;
                    return updateFavoritesMenu(menu);
                }
            });
        }

        function deleteFavorite(id) {
            const selectedMenuId = favoritesMenuSelect.value;
            return getFavoritesMenu(selectedMenuId).then(menu => {
                const index = menu.favorites.findIndex(fav => fav.id == id);
                if (index !== -1) {
                    menu.favorites.splice(index, 1);
                    return updateFavoritesMenu(menu);
                }
            });
        }

        function exportFavorites() {
            const selectedMenuId = favoritesMenuSelect.value;
            return getFavoritesMenu(selectedMenuId).then(menu => menu.favorites || []);
        }

        function clearFavorites() {
            const selectedMenuId = favoritesMenuSelect.value;
            return getFavoritesMenu(selectedMenuId).then(menu => {
                menu.favorites = [];
                return updateFavoritesMenu(menu);
            });
        }

        // 検索エンジンの読み込み
        function populateSearchEngines() {
            const searchEngineSelect = document.getElementById('searchEngine');
            const searchEngines = [
                { name: 'DuckDuckGo(おすすめ)', url: 'https://duckduckgo.com/?q={query}' },
                { name: 'Google', url: 'https://www.google.com/search?q={query}' },
                { name: 'Bing', url: 'https://www.bing.com/search?q={query}' },
                { name: 'ChatGPT', url: 'https://chatgpt.com/?q={query}' },
                { name: 'Perplexity', url: 'https://www.perplexity.ai/?q={query}' },
                { name: 'GenSpark', url: 'https://www.genspark.ai/search?query={query}' },
                // ここに検索エンジンを追加できます
            ];
            searchEngineSelect.innerHTML = '';
            searchEngines.forEach(engine => {
                const option = document.createElement('option');
                option.value = engine.url;
                option.textContent = engine.name;
                searchEngineSelect.appendChild(option);
            });
        }
    }
});