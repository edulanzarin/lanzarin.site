// login.js
import { loginUsuario } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector(".submit-button").addEventListener("click", (event) => {
        event.preventDefault(); 

        const usuario = document.querySelector("#username").value;
        const senha = document.querySelector("#password").value;

        loginUsuario(usuario, senha);
    });
});
