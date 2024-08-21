// Importar os módulos Firebase do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDNLluldWmJwUz0_VrWz40uTjZ6MXpjTn0",
  authDomain: "lanzarin-site.firebaseapp.com",
  databaseURL: "https://lanzarin-site-default-rtdb.firebaseio.com",
  projectId: "lanzarin-site",
  storageBucket: "lanzarin-site.appspot.com",
  messagingSenderId: "691721879467",
  appId: "1:691721879467:web:329c299f0395f977b89cee",
  measurementId: "G-4QFYR3H4TL",
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Função para verificar o usuário autenticado
export async function verificarUsuario() {
  const idUsuario = sessionStorage.getItem("id_usuario");

  if (!idUsuario) {
    // Redireciona para a página de login se o id_usuario não estiver no sessionStorage
    window.location.href = "login.html";
    return;
  }

  try {
    const usuariosRef = ref(database, `usuarios/${idUsuario}`);
    const snapshot = await get(usuariosRef);

    if (snapshot.exists()) {
      console.log("Usuário autenticado:", snapshot.val());
      // O usuário está autenticado; adicione o código para mostrar o conteúdo da página
    } else {
      console.error("Usuário não encontrado.");
      // Redireciona para a página de login se o usuário não for encontrado
      window.location.href = "login.html";
    }
  } catch (error) {
    console.error("Erro ao verificar o usuário:", error.message);
    // Redireciona para a página de login em caso de erro
    window.location.href = "login.html";
  }
}

// Função para lidar com o login
export async function loginUsuario(usuario, senha) {
  try {
    const usuariosRef = ref(database, "usuarios");
    const snapshot = await get(usuariosRef);

    if (snapshot.exists()) {
      let usuarioEncontrado = false;

      snapshot.forEach((childSnapshot) => {
        const userId = childSnapshot.key;
        const userData = childSnapshot.val();

        if (userData.usuario === usuario && userData.senha === senha) {
          usuarioEncontrado = true;
          // Armazena o id_usuario no sessionStorage e redireciona
          sessionStorage.setItem("id_usuario", userId);
          window.location.href = "index.html"; // Redireciona para a página inicial
          return true; // Interrompe a iteração se o usuário for encontrado
        }
      });

      if (!usuarioEncontrado) {
        console.error("Usuário ou senha incorretos.");
        // Mostrar mensagem de erro para o usuário
      }
    } else {
      console.error("Nenhum dado encontrado.");
      // Mostrar mensagem de erro para o usuário
    }
  } catch (error) {
    console.error("Erro ao fazer login:", error.message);
    // Mostrar mensagem de erro para o usuário
  }
}
