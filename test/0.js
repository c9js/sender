/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
require('core'); // Ядро
const Sender = require('..'); // Передатчик

// Создаем передатчик
const _sender = new Sender('eth0');

// Добавляем обработчик всех событий
_sender.on((res) => {
    _=res
});

// Передаем сообщение раз в 1 секунду
(async () => {
    while (true) {
        await _sender('FFFFFFFFFFFF0123456789000001');
        await new Promise(r => setTimeout(r, 3000));
    }
})();
