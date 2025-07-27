/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
const { spawn } = require('child_process');
const path = require('path');

/*▄─────────────▄
  █             █
  █  Настройки  █
  █             █
  ▀─────────────▀*/
// Максимальный размер буфера для stdout и stderr (4 КБ)
const MAX_BUFFER_SIZE = 4096;

/*▄──────────────────────▄
  █                      █
  █  Создает передатчик  █
  █                      █
  ▀──────────────────────▀*/
const Utils = class {
/*┌────────────────────────────┐
  │ Проверяет валидацию пакета │
  └────────────────────────────┘
    /**
     * Проверяет, является ли строка валидным HEX-пакетом.
     * @param {string} message - Строка с hex-данными.
     * @returns {string|null} - Сообщение об ошибке или null, если всё ок.
     */
    static isValidHex = (message) => {
    // Пакет должен содержать только hex-символы [0-9] и [A-F]
        if (!/^[0-9a-fA-F]+$/.test(message)) return [
            'Пакет должен содержать только hex-символы [0-9] и [A-F]!',
            'Тело пакета:', message
        ].join('\n');
        
    // Длина пакета меньше 28 символов
        if (message.length < 28) return [
            'Длина пакета меньше 28 символов!',
            'Текущая длина:', message.length
        ].join('\n');
        
    // Длина пакета больше 3028 символов
        if (message.length > 3028) return [
            'Длина пакета больше 3028 символов!',
            'Текущая длина:', message.length
        ].join('\n');
        
    // Длина пакета должна быть четной (каждый байт 2 символа)
        if (message.length % 2 != 0) return [
            'Длина пакета должна быть четной (каждый байт 2 символа)!',
            'Текущая длина:', message.length
        ].join('\n');
        
    // Проверка прошла успешно
        return null;
    }
    
/*┌───────────────────────┐
  │ Добавляет обработчики │
  └───────────────────────┘*/
    /**
     * Назначает обработчики на stdout/stderr и события child-процесса.
     * @param {ChildProcess} child
     * @param {Object} handlers
     */
    static attachHandlers = (child, handlers) => {
        child.stdout.on('data', handlers.stdout); // Обработчик буфера для stdout
        child.stderr.on('data', handlers.stderr); // Обработчик буфера для stderr
        child.on('error', handlers.error);        // Обработчик ошибки
        child.on('close', handlers.close);        // Обработчик завершения процесса
    }
    
/*┌─────────────────────┐
  │ Удаляет обработчики │
  └─────────────────────┘*/
    static detachHandlers = (child, handlers) => {
        child.stdout.off('data', handlers.stdout); // Обработчик буфера для stdout
        child.stderr.off('data', handlers.stderr); // Обработчик буфера для stderr
        child.off('error', handlers.error);        // Обработчик ошибки
        child.off('close', handlers.close);        // Обработчик завершения процесса
    }
};

/*▄──────────────────────▄
  █                      █
  █  Создает передатчик  █
  █                      █
  ▀──────────────────────▀*/
module.exports = function(iface = 'eth0', timeout = 3000) {
/*┌────────────────────────────────┐
  │ Объявляем локальные переменные │
  └────────────────────────────────┘*/
    let _callbacks = []; // Коллекция обработчиков всех событий
    
/*┌──────────────────────┐
  │ Возвращает результат │
  └──────────────────────┘*/
    let _result = (result, extra = {}) => {
    // Добавляем новые поля
        Object.assign(result, extra);
        
    // Выполняем коллекцию обработчиков всех событий
        _callbacks.forEach(callback => callback(result));
        
    // Возвращаем результат
        return result;
    };
    
/*┌───────────────────────────────┐
  │ Возвращает обработанный ответ │
  └───────────────────────────────┘*/
    let _response = (child, buffers, type, ...args) => {
    // Создаем результат
        let res = {
            ok: false // Статус завершения
        };
        
    // Пакет не прошел валидацию
        if (type == 'validation') return _result(res, {
            validationError: true, // Информация о не пройденной валидации
            error: args[0]         // Информация об ошибке
        });
        
    // Процесс завершен с ошибкой
        if (type == 'error') return _result(res, {
            error: args[0] // Информация об ошибке
        });
        
    // Добавляем буферы для stdout и stderr
        res.stdout = Buffer.concat(buffers.stdout).toString(); // Буфер для stdout
        res.stderr = Buffer.concat(buffers.stderr).toString(); // Буфер для stderr
        
    // Процесс завершен по таймауту
        if (type == 'timeout') {
            res.timeout = true;             // Информация о выходе по таймауту
            try { child.kill('SIGKILL') }   // Убиваем процесс
            catch (e) { res.killError = e } // Процесс не был убит
        }
        
    // Процесс завершен успешно
        if (type == 'close') {
            res.ok = args[0] === 0; // Статус завершения
            res.code = args[0];     // Код выхода
            res.signal = args[1];   // Сигнал прерывания
        }
        
    // Возвращаем результат
        return _result(res);
    };
    
/*┌────────────────┐
  │ Передает пакет │
  └────────────────┘*/
    /**
     * Отправляет hex-пакет через внешний процесс.
     * @param {string} message - Hex-строка.
     * @returns {Promise<object>} - Объект результата выполнения.
     */
    let _sender = (message) => new Promise((resolve) => {
    // Список локальных переменных
        let worker = {}; // Выход по таймауту и состояние процесса
        
    // Список буферов для stdout и stderr
        let buffers = {stdout:[], stderr:[]};
        let sizes = {stdout:0, stderr:0};
        
    // Добавляет данные в буфер
        let addData = (buffer, data) => {
            const remaining = MAX_BUFFER_SIZE - sizes[buffer];
            if (remaining > 0) {
                const chunk = data.slice(0, remaining);
                sizes[buffer] += chunk.length;
                buffers[buffer].push(chunk);
            }
        };
        
    // Завершает текущий процесс
        let done = (...args) => {
        // Проверяем состояние процесса
            if (worker.state == 'done') return;
            
        // Обновлем состояние процесса
            worker.state = 'done';
            
        // Удаляем обработчики
            if (worker.child) {
                Utils.detachHandlers(worker.child, handlers);
            }
            
        // Отменяем выход по таймауту
            clearTimeout(worker.timeout);
            
        // Завершаем текущий процесс
            resolve(
                _response(worker.child, buffers, ...args) // Возвращаем обработанный ответ
            );
        };
        
    // Проверяем валидацию пакета
        const error = Utils.isValidHex(message);
        if (error) return done('validation', error);
        
    // Передаем пакет
        worker.child = spawn(path.resolve(__dirname, 'sender'), [iface, message]);
        
    // Создаем обработчики
        const handlers = {
            stdout: (data) => addData('stdout', data),           // Обработчик буфера для stdout
            stderr: (data) => addData('stderr', data),           // Обработчик буфера для stderr
            error: (error) => done('error', error),              // Обработчик ошибки
            close: (code, signal) => done('close', code, signal) // Обработчик завершения процесса
        };
        
    // Добавляем обработчики
        Utils.attachHandlers(worker.child, handlers);
        
    // Добавляем выход по таймауту
        worker.timeout = setTimeout(() => done('timeout'), timeout);
    });
    
/*┌─────────────────────────────────────────┐
  │ Добавляет новый обработчик всех событий │
  └─────────────────────────────────────────┘*/
    _sender.on = (callback) => _callbacks.push(callback);
    
/*┌───────────────────────┐
  │ Возвращаем передатчик │
  └───────────────────────┘*/
    return _sender;
};
