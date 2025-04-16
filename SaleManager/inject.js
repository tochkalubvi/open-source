// ПОЛУЧЕНИЕ СОДЕРЖИМОГО СТРАНИЦЫ (фУНКЦИЯ ИЗ ОСНОВНОЙ ПРОГРАММЫ)
async function get_page(url) {
  return fetch(url)
      .then(data => {return data.text()})
      .catch(error => console.error('Error fetching data:', error));
}

//ГЛАВНЫЙ КЛАСС ПРИ ЗАПУСКЕ МЕНЮ С ПРОДАЖАМИ
class SaleManager {

    // конструктор класса
    constructor() {
        // подготовка переменнвх
        this.salesData = new Map(); // {id: {trElement, htmlContent}}
        this.start();
    }

    // функция для асинхронного постепенного запуска кода
    async start() {
        await this.processPage();
    }

    //функцияя работы с страницей
    async processPage() {

            // получение страницы
            const html = await this.get_html();

            // получение ссылок для обработки
            let links = await this.get_links(html);
            await this.processLinks(links);

            // ... коррекция ссылкок, переход по ним, получение информации со страниц...
        
    }

    // функция из основного приложения для получения содержимого страницы в новой версии приложения
    async get_html() {

        // для новой версии
        if (!window.location.href.includes("cpanel")) {
            return document.body;
        }

        // получение содержимоего ожидая его
        return await this.waitForIframeAndElement("tbody");
    }

    // ожидание содержимого страницы
    async waitForIframeAndElement(selector) {

        // отправка запроса на поиск нужного элемента страницы
        return new Promise((resolve) => {
            const checkIframe = () => {

                // получение iframe из внешней ссылки
                const iframe = document.querySelector('main iframe');
                if (!iframe) {
                    // проверка элемента с задержкой в 100 миллисекунд
                    setTimeout(checkIframe, 100);
                    return;
                }

                // при получении ответа проверяем на прогрузку целевого элемента (таблицы с информацией о чеке)
                const checkElement = () => {
                    try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        const element = iframeDoc.querySelector(selector);
                        if (element) {
                            resolve(element);
                        } else {
                            // задержка 100 мс
                            setTimeout(checkElement, 100);
                        }
                    } catch (e) {
                        // задержка 100 мс
                        setTimeout(checkIframe, 100);
                    }
                };

                // Завершение поиска целевого элемента
                checkElement();
            };

            // Завершение поиска iframe
            checkIframe();
        });
    }

    // получение ссылок, сортировка
    async get_links(container) {
        const links = []; // список ссылок пока пустой
        const rows = container.querySelectorAll('tbody tr'); // список элементов для обработки
        
        // обход каждой ссылки
        rows.forEach(tr => {
            const link = tr.querySelector('a.update');
            // проверка ссылки на битость
            if (link) {
                // проверка ссылки получения номера продажи
                const receiptId = link.href.match(/\/id\/(\d+)/)[1];
                // если номер продажи есть добавляем в список, формируем.
                if (receiptId) { 
                    links.push({
                        id: receiptId,
                        trElement: tr,
                        url: `https://tl.myvirtualpos.ru/console/sales/view/id/${receiptId}`
                    });
                }
            }
        });

        return links; // получаем сортированный разобранный список ссылок
    }

    // обходим ссылки
    async processLinks(links) {

        // ошибочный чек
        function mark(e) {
            e.style.borderLeft = "10px solid red";
        }

        // верный чек
        function demark(e) {
            e.style.borderLeft = "10px solid gray";
        }

        // коомментарий к ошибке
        function comment(element, errorMessage) {
            // Создаем элемент для комментария
            const tooltip = document.createElement('div');
            tooltip.textContent = errorMessage;
            tooltip.style.display = 'none';
            tooltip.style.position = 'absolute';
            tooltip.style.background = '#ffebee';
            tooltip.style.border = '1px solid #f44336';
            tooltip.style.padding = '4px 8px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.zIndex = '1000';
            document.body.appendChild(tooltip);
          
            // Показываем при наведении
            element.addEventListener('mouseenter', (e) => {
              tooltip.style.display = 'block';
              tooltip.style.top = `${e.clientY + 10}px`;
              tooltip.style.left = `${e.clientX + 10}px`;
            });
          
            // Прячем при уходе курсора
            element.addEventListener('mouseleave', () => {
              tooltip.style.display = 'none';
            });
          
            // Обновляем позицию при движении мыши
            element.addEventListener('mousemove', (e) => {
              tooltip.style.top = `${e.clientY + 10}px`;
              tooltip.style.left = `${e.clientX + 10}px`;
            });
          }

        // привязываем ошибки к каждой строчке с ошибке
        for (const link of links) {
            if (!this.salesData.has(link.id)) {
                    const cont = await this.fetchReceiptHtml(link.url);
                    if (!cont[0]) {
                        mark(link.trElement)
                        comment(link.trElement, cont[1])
                    } else {
                        demark(link.trElement)
                    }
            }
        }
    }

    // анализируем информацию полученную с чеков
    async analyzeReceipt(details) {
        // Разбиваем details на составляющие
        let traffic = details[0][0]
        let noPurchaseReason = details[0][1]
        let comment = details[0][2]

        let resps = details[1]

        let is_market = details[2]
        if (details[3]) {
            return [true, ""];
        }

        let deny = ["", "Не задан"]
        
        // Проверяем наличие специальных товаров
        const hasNoProduct = resps.some(item => item.includes("нетовар"));
        const hasShiftOpening = resps.some(item => item.includes("открытие смены"));
        const hasClientOrder = resps.some(item => item.includes("клиентский заказ"));

      
        // Проверка для "нетовар"
        if (hasNoProduct) {
          if (deny.includes(traffic)) {
            return [false, "Для 'нетовар' должен быть указан трафик покупателя"];
          }
          
          if (!noPurchaseReason || noPurchaseReason.trim() === "") {
            return [false, "Для 'нетовар' должна быть указана причина непокупки"];
          }
          
          if (deny.includes(comment)) {
            return [false, "Для 'нетовар' должен быть указан комментарий"];
          }
        }
      
        // Проверка для "открытие смены"
        if (hasShiftOpening) {
          const keywords = ["ос", "открытие", "смен", "смены"];
          const commentWords = comment ? comment.toLowerCase().split(/\s+/) : [];
          
          const hasKeywords = keywords.some(keyword => 
            commentWords.some(word => word.includes(keyword))
          );
          
          if (!hasKeywords) {
            return [false, "Для 'открытие смены' в комментарии должны быть ключевые слова: ос, открытие, смен"];
          } else {return [true, ""]}
        }
      
        // Проверка для "клиентский заказ"
        if (hasClientOrder) {
          if (deny.includes(traffic)) {
            return [false, "Для 'клиентский заказ' должен быть указан трафик"];
          }
          
          if (deny.includes(comment)) {
            return [false, "Для 'клиентский заказ' должен быть указан комментарий"];
          }
        }
      
        // Проверка для маркет/мобильных заказов
        if (is_market) {
          const marketTraffic = ["Яндекс Маркет", "Яндекс Еда (Деливери)", "ОЗОН", "Сбер"];
          const mobileTraffic = ["Приложение", "Сайт Страсть"];
          const takeupTraffic = ["Самовывоз"];
          
          const isValidTraffic = [...marketTraffic, ...mobileTraffic, ...takeupTraffic].includes(traffic);
          
          if (!isValidTraffic) {
            console.log([...marketTraffic, ...mobileTraffic, ...takeupTraffic], traffic)
            return [false, "Для маркет/мобильного заказа должен быть соответствующий трафик"];
          }

          if (deny.includes(comment)) {
            return [false, "Для 'мобильного приложения' должен быть указан номер заказа в коментарии"];
          }
        }

        if (deny.includes(traffic)) {
            return [false, "Данный чек требует указания трафика"];
        }
      
        // Если все проверки пройдены
        return [true, ""];
      }
    
    // разбиваем содержимое чека на необходимые элементы для анализа
    async fetchReceiptHtml(url) {

        // получаем страницу чека
        let page = await get_page(url) 
        let html = document.createElement("div")
        html.innerHTML = page

        // ищем содержимое страницы
        html = html.querySelector("#yw0")

        // главная таблица
        let details = html.querySelector("table.detail-view tbody")

        // проверка на возврат
        let is_returned = (!details.querySelector("tr:nth-child(17)").classList.contains('cssDisplayNone'))  

        details = [
            details.querySelector("tr:nth-child(19) td").innerText, // трафик
            details.querySelector("tr:nth-child(20) td").innerText, // причина непокупки
            details.querySelector("tr:nth-child(21) td").innerText  // комментарий
        ]

        // список товаров
        let reciept = html.querySelectorAll("#receipt-items tbody tr")

        let resps = []

        // сортировка товара по названию
        reciept.forEach(e => {
            let title = e.querySelector("td:nth-child(2)")
            title = title.innerText.trim()
            resps.push(title)
        });

        // проверка на маркетплейсы и мп
        let is_market = false

        if (!html.querySelector("#yw2 table tbody tr td").classList.contains("empty")) {
            let first_part = html.querySelector("#yw2 table tbody tr:nth-child(1)")
            is_market = ((first_part.querySelector("td:nth-child(3)").innerText.trim() == "Применена") && (first_part.querySelector("td:nth-child(2)").innerText.trim() == "Скидка служебная МП"))
        }
        

        return this.analyzeReceipt([details, resps, is_market, is_returned]);
    }   
}

// первичный запуск класса при перезагрузке страницы
new SaleManager()

// Сохраняем оригинальный метод open
const originalXHROpen = XMLHttpRequest.prototype.open;

// Переопределяем метод open
XMLHttpRequest.prototype.open = function(method, url) {
  // Сохраняем URL в объекте XHR для использования в других методах
  this._requestUrl = url; 
  
  // Если URL содержит нужный параметр, добавляем обработчик
  if (url.includes('ajax=receipts-grid') || window.location.href.includes("sales/manage")) {
    // console.log('[Перехват] Найден запрос чеков:', url);
    
    // Добавляем обработчик успешной загрузки
    this.addEventListener('load', function() {
    //   console.log('[Успех] Данные чеков загружены');
      setTimeout(() => {
        new SaleManager()
      }, 100); // Даём время на рендер
    });
    
    // Добавляем обработчик ошибок
    this.addEventListener('error', function() {
    //   console.error('[Ошибка] Не удалось загрузить чеки');
    });
  }
  
  // Вызываем оригинальный метод
  originalXHROpen.apply(this, arguments);
};
