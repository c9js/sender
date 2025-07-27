/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
const { spawn } = require('child_process');

/*▄──────────────────────▄
  █                      █
  █  Создает передатчик  █
  █                      █
  ▀──────────────────────▀*/
module.exports = function(iface) {
/*┌────────────────────────────────┐
  │ Создаем коллекцию обработчиков │
  └────────────────────────────────┘*/
    let _collection = {};
    
/*┌────────────────────┐
  │ Передает сообщение │
  └────────────────────┘*/
    let _sender = (message) => new Promise((res, rej) => {
        const process = spawn('./sender', [iface, message]);
        
        process.stdout.on('data', (data) => {
            console.log(`${data}`);
        });
        
        process.stderr.on('data', (data) => {
            console.error(`Error: ${data}`);
        });
        
        process.on('error', (error) => {
            if (listeners.error) {
                listeners.error.forEach((cb) => cb(error));
            }
            reject(error);
        });
        
        process.on('close', (code) => {
            if (code == 0) {
                res(`Команда завершена с кодом ${code}`);
            } else {
                rej(`Команда завершена с ошибкой с кодом ${code}`);
            }
        });
    });
    
/*┌────────────────────────────┐
  │ Добавляет новый обработчик │
  └────────────────────────────┘*/
    _sender.on = (event, callback) => {
        if (!_collection[event]) {
            _collection[event] = [];
        }
        _collection[event].push(callback);
        return promise; // для цепочки
    };
/*┌───────────────────────┐
  │ Возвращаем передатчик │
  └───────────────────────┘*/
    return _sender;
};
