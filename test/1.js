/*────────────────────────────────────────────────────────────────────────────────────────────────*/

Object.defineProperties(global,{__:{set:v=>process.exit(_=v)},_:{set:console.log}});
Object.defineProperty(global, '$', {value:{}});

/*────────────────────────────────────────────────────────────────────────────────────────────────*/

let A = function() {
    let f = f=>0;
    f.b = 1;
    return f;
};
let a = A();
_=a.b
