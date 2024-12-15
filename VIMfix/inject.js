// ШАБЛОНЫ СТРАНИЦ НА КОТОРЫХ ЗАПУСКАЕТСЯ СКРИПТ
const url_template = ["inflow/view/id"]
// ФУНКЦИЯ ПРОВЕРЯЕТ НАДОБНОСТЬ ФУНКЦИИ НА СТРАНИЦЕ
function url_check() {
    // ПОДГОТОВКА ПЕРЕМЕННЫХ
    let result = false; let url = window.location.href;
    // СВЕРКА ССЫЛКИ САЙТА С ШАБЛОНАМИ
    url_template.forEach(urlt => {
        // ЕСЛИ ССЫЛКА С ШАБЛОНОМ СОВПАДАЕТ РЕЗУЛЬТАТ ПОЛОЖИТЕЛЬНЫЙ
        if (url.includes(urlt)) {result = true}
    }); return result;
}

// КЛАСС FIX MODAL 
class FixModal {

    constructor() {

        // НАЧАЛЬНЫЕ ПЕРЕМЕННЫЕ
        this.html = false // содержимое
        this.main = false // внешняя страница для проверки прокрутки
        this.obs = false  // обозреватель
        this.pos = 0      // позиция
        this.ticking = false; // тиккинг

        // ЗАПУСКАЕМ КЛАСС ЕСЛИ ШАБЛОН СОВПАДАЕТ С ССЫЛКОЙ
        if (url_check()) {this.run()} 

    }

    // ОБНОВЛЕНИЕ ЗНАЧЕНИЙ ДО АКТУАЛЬНЫХ ДАННОЙ СТРАНИЦЕ
    async get_variables_actual() {
        this.html = await this.get_html("table.items")
        this.html = await this.get_html("body")
        this.main = document.querySelectorAll("main")[0]
    }

    // КЛАСС ЗАПУСКА
    async run() {
        await this.get_variables_actual() // получение актуальных данных
        this.createListener()             // создание обозревателя
    }

    // СОЗДАНИЕ ОБОЗРЕВАТЕЛЯ МОДАЛЬНЫХ ОКОН
    createListener() {

        // В РАННЕЕ СОЗДАННУЮ ПЕРЕМЕННУЮ КИДАЕМ ПОИСК МУТАЦИЙ НА СТРАНИЦЕ
        this.obs = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Проверяем, добавлены ли новые узлы
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach((node) => {
                        // Проверяем, является ли добавленный узел элементом 
                        // и соответствует ли селектору модального окна
                        if (node.nodeType === 1 && node.matches('.modal-scrollable')) {
                            this.scroll_event(); // запускает ивент обнаруженного модального окна
                        }
                    });
                }
            });
        });

        // Начинаем наблюдение за телом документа
        this.obs.observe(this.html, {
            childList: true,
            subtree: true
        });
        
    }

    // УДАЛЕНИЕ ОБОЗРЕВАТЕЛЯ
    deleteListener() {
        // ОТКЛЮЧАЕТ ОБОЗРЕВАТЕЛЬ И ПРИСВАЕВАЕТ ЕМУ ЗНАЧЕНИЕ 
        // FALSE ЕСЛИ ОБОЗРЕВАТЕЛЬ ЕЩЕ НЕ FALSE
        if (this.obs) {this.obs.disconnect();this.obs = false;}
    }

    // ЕВЕНТ НАХОЖДЕНИЯ МОДАЛЬНОГО ОКНА
    async scroll_event() {

        // ДОПОЛНИТЕЛЬНО ПРОВЕРЯЕМ ССЫЛКУ
        if (url_check()) {
            
            // ПОЛУЧАЕМ РАСТОЯНИЕ ОТ НАЧАЛА СТРАНИЦЫ
            this.pos = this.main.scrollTop;
            
            // ЕСЛИ НЕ ТИКАЕТ
            if (!this.ticking) {
                // СИНХРОНИЗИРУЕМ АНИМАЦИЮ С ПОЯВЛЕНИЕМ ОКНА
                window.requestAnimationFrame(() => {
                    // ПОЛУЧАЕМ МАКСИМАЛЬНУЮ ВЫСОТУ СТРАНИЦЫ
                    let max = this.main.scrollHeight-screen.height
                    
                    // ПОЛУЧАЕМ ЭЛЕМЕНТ МОДАЛЬНОГО ОКНА
                    let modal = this.html.querySelectorAll(".modal-scrollable")[0]

                    // ДОПОЛНИТЕЛЬНО ПРОВЕРЯЕМ ЕГО НАЛИЧИЕ
                    if (modal != null) {
                        // ВЫСТАВЛЯЕМ НУЖНУЮ ПОЗИЦИЮ ДЛЯ ОКНА И МЕНЯЕМ 
                        // СТИЛЬ УМЕНЯЬШАЯ ОКНО ДЛЯ УДОБНОЙ РАБОТЫ С НИМ
                        let per = this.pos
                        let win = modal.querySelectorAll(".modal")[0]
                        win.style.top = `${per+window.screen.height/2.7}px`
                        win.style.transform = `scale(0.7)`
                    }
                    // УБИРАЕМ ТИК И ЖДЕМ НОВОГО
                    this.ticking = false;
                }); this.ticking = true;
            }
        }
    }

    // КОММЕНТАРИИ К ДАННОЙ ФУНКЦИИИ ИЗЛИШНЕ, НО ЕСЛИ ОБЪЯСНЯТЬ В КРАТЦЕ ЕЕ СМЫСЛ
    // НОВАЯ ВЕРСИЯ САЙТА - SPA (single page application), ИЗ ЗА ЧЕГО СТРАНИЦА ОБНОВЛЯЕТСЯ
    // ТОЛЬКО В ТОМ СЛУЧАЕ ЕСЛИ ЭТО СДЕЛАЛ ПОЛЬЗОВАТЕЛЬ, ЧТО ТРЕБУЕТ ОТСЛЕЖИВАНИЯ ИЗМЕНЕНИЯ ССЫЛКИ

    // А ТАК КАК СУДЯ ПО ВСЕМУ ОПЫТА РАБОТЫ С СПА У РАЗРАБОТЧИКОВ VP НЕТУ ТО ОНИ ПРОСТО СДЕЛАЛИ
    // САЙТ В САЙТЕ,  НО ТЕМ САМЫМ ПОДСУНУЛИ НАМ КРЫСУ, ТЕПЕРЬ, НЕТ ТАКОЙ ВОЗМОЖНОСТИ ПРОСТО ПОЛУЧИТЬ
    // СОДЕРЖИМОЕ СТРАНИЦЫ ТАК КАК ОНО ПОДГРУЖАЕТСЯ ДИНАМИЧЕСКИ, ПОЭТОМУ БЫЛО ПРИНЯТО РЕШЕНИЕ СДЕЛАТЬ УНИВЕРСАЛЬНУЮ
    // ФУНКЦИЮ ДЛЯ ПОЛУЧЕНИЯ СОДЕРЖИМОГО СТРАНИЦЫ И РАБОТЫ С НИМ. ЖИВЕМ.
    async get_html(s) {

        // ПОЛЧУЧАЕМ ПУСТУЮ СТРАНИЦУ ТАК КАК ОНА ЕЩЕ НЕ ПРОГРУЗИЛАСЬ
        let html = document.body

        // ФУНКЦИЯ ОЖИДАНИЯ КОНТЕНТА ПО ССЫЛКЕ НА КОНКРЕТНЫЙ ЭЛЕМЕНТ
        async function waitForIframeAndElement(selector) {

            // СОЗДАЕТСЯ ПРОМИС НА ОЖИДАНИЕ В 100 МИЛИ СЕКУНД
            // ИМЕННО С ТАКОЙ ЧАСТОТОЙ МЫ ПРОВЕРЯЕМ ПОЯВЛЕНИЕ КОНТЕНТА НА СТРАНИЦЕ
            return new Promise((resolve, reject) => {

                // СОЗДАЕМ ИНТЕРВАЛ
                const checkIframe = setInterval(() => {

                    // ИЩЕМ УНИВЕРСАЛЬНЫЙ СЕЛЕКТОР main iframe КАК РАЗ ПОИСК САЙТА В САЙТЕ
                    const iframe = document.querySelector('main iframe');

                    // ТОЛЬКО ЕСЛИ IFRAME НЕ РАВЕН NULL
                    if (iframe) {

                        // ПРОВОДИМ ПОИСК СЕЛЕКТОРА ИЛИ ССЫЛКИ НА ЭЛЕМЕНТ 
                        // ВНУТРИ IFRAME ОБЫЧНО ИЩЕМ BODY НО МОЖНО ЧТО УГОДНО
                        const checkElement = setInterval(() => {
                            
                            // ДЛЯ УНИВЕРСАЛЬНОСТИ В РАЗНЫХ БРАУЗЕРАХ ИСПОЛЬЗУЕМ ДВА ВОЗМОЖНЫХ СЦЕНАРИЯ
                            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
                            const element = iframeDocument.querySelector(selector);

                            // ЕСЛИ ЭЛЕМЕНТ НАЙДЕН
                            if (element) {

                                // ОЧИЩАЕМ ИНТЕРВАЛЫ 
                                clearInterval(checkElement);
                                clearInterval(checkIframe);

                                // ВОЗВРАЩАЕМ В КАЧЕСТВЕ ОТВЕТА ПРОМИСА НУЖНЫЙ ЭЛЕМЕНТ
                                resolve(element);
                            }
                        }, 100);
                    }
                }, 100);
            });
        }
        
        // ЭТОТ ФРАГМЕНТ ФУНКЦИИ СЕБЯ ИЗЖИЛ
        // ПОТОМУ ЧТО СТАРОЙ ВЕРСИИ САЙТА УЖЕ НЕТ
        // НО ЕСЛИ БУДЕТ ПУСТЬ ЭТО ТУТ ПОБУДЕТ ДЛЯ УНИВЕРСАЛЬНОСТИ
        if (window.location.href.includes("cpanel")) {
            html = await waitForIframeAndElement(s)
        }

        // ВОЗВРАТ HTML ФУНКЦИЕЙ GET_HTML()
        return html
    }
}

var fix_modal_2025 = new FixModal()

// ЧАСТЬ ОПРЕДЕЛЯЮЩАЯ ТИП СТРАНИЦЫ, ДЛЯ ОРИЕНТАЦИИ ПО САЙТУ
function trackUrlChanges() {

    // ПЕРВОНОЧАЛЬНАЯ ССЫЛКА ЗАПУСКА САЙТА
    let currentUrl = window.location.href;

    // ОБОЗРЕВАТЕЛЬ ИЗМЕНЕНИЙ НА САЙТЕ 
    const observer = new MutationObserver(() => {

        // ПРИ ИЗМЕНЕНИИ НА САЙТЕ ОН СМОТРИТ НОВУЮ ССЫЛКУ
        let href = window.location.href

        // ЕСЛИ С ПРОШЛОЙ ССЫЛКОЙ ОНИ НЕ РАВНЫ
        if (currentUrl !== href) {

            if (url_check()) {
                fix_modal_2025 = new FixModal()
                fix_modal_2025.createListener()
            } // ЕСЛИ ССЫЛКА ВЕДЕТ НА ПОСТУПЛЕНИЕ ЗАПУСКАЕМ СКРИПТ ВЫШЕ 
            else {fix_modal_2025.deleteListener()} // ИНАЧЕ ОТКЛЮЧАЕМ ПРОСЛУШКУ МОДУЛЬНЫХ ОКОН И СПИМ
            currentUrl = href // ЗАПОМНИТЬ НОВУЮ ССЫЛКУ 

        }});
    
    // НАСТРОЙКА ОБОЗРЕВАТЕЛЯ
    observer.observe(document, { childList: true, subtree: true });

}; trackUrlChanges(); // ПЕРВИЧНЫЙ ЗАПУСК ОБОЗРЕВАТЕЛЯ

document.addEventListener("DOMContentLoaded", function() {trackUrlChanges();}); // ВТОРИЧНЫЙ ЗАПУСК ПОСЛЕ ПРОГРУЗКИ СТРАНИЦЫ
