/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
require('core'); // Ядро
const Sender = require('.'); // Передатчик

// Создаем передатчик
const _sender = new Sender('eth0', 1000)

// Добавляем обработчик ошибок
_sender.data((error) => {
    _=['Ошибка: ', error]
});

_sender.error((error) => {
    _=['Ошибка: ', error]
});

_sender.close((error) => {
    _=['Ошибка: ', error]
});

// Передаем сообщение
(async () => {
    await _sender('FFFFFFFFFFFF0123456789000001');
    await _sender('FFFFFFFFFFFF0123456789000002');
})();
