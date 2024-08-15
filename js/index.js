import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  push,
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

// ID do administrador
const ADMIN_ID = "r8qE9f7JkL1Pz2Tn0vWx";
let chatIdAtual = null;

// Função para carregar a lista de chats
async function carregarChats() {
  try {
    const idUsuarioLogado = sessionStorage.getItem("id_usuario");
    if (!idUsuarioLogado) {
      window.location.href = "login.html";
      return;
    }

    const usuariosRef = ref(database, "usuarios");
    const snapshot = await get(usuariosRef);

    if (snapshot.exists()) {
      const chatList = document.querySelector(".chat-list");
      chatList.innerHTML = ""; // Limpa a lista de chats existente

      snapshot.forEach((childSnapshot) => {
        const userId = childSnapshot.key;
        const userData = childSnapshot.val();

        if (idUsuarioLogado === ADMIN_ID || userId === ADMIN_ID) {
          // Se o usuário logado for o admin ou o chat for com o admin
          if (userId !== idUsuarioLogado) {
            // Exclui o próprio usuário logado da lista
            const chatItem = document.createElement("li");
            chatItem.className = "chat-item";
            chatItem.dataset.chatId = userId;
            chatItem.textContent = userData.nome; // Apenas o nome do usuário
            chatList.appendChild(chatItem);
          }
        }
      });
    } else {
      console.error("Nenhum dado encontrado.");
    }
  } catch (error) {
    console.error("Erro ao carregar chats:", error.message);
  }
}

// Função para carregar as mensagens de um chat
function carregarMensagens(chatId) {
  const idUsuarioLogado = sessionStorage.getItem("id_usuario");
  // Ordena os IDs para garantir um caminho consistente
  const chatPath =
    idUsuarioLogado < chatId
      ? `${idUsuarioLogado}_${chatId}`
      : `${chatId}_${idUsuarioLogado}`;

  const mensagensRef = ref(database, `mensagens/${chatPath}`);

  onValue(mensagensRef, (snapshot) => {
    const mensagens = [];
    snapshot.forEach((childSnapshot) => {
      mensagens.push(childSnapshot.val());
    });
    mostrarMensagens(mensagens, idUsuarioLogado);
  });
}

function mostrarMensagens(mensagens, idUsuarioLogado) {
  const chatMessages = document.querySelector(".chat-messages");
  chatMessages.innerHTML = ""; // Limpa mensagens existentes

  mensagens.sort((a, b) => (a.id_mensagem > b.id_mensagem ? 1 : -1)); // Ordena mensagens

  mensagens.forEach((mensagemData) => {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${
      mensagemData.id_usuario1 === idUsuarioLogado ? "sent" : "received"
    }`;

    // Descriptografa a mensagem
    const secretKey = "sua-chave-secreta"; // Mesma chave usada para criptografia
    const decryptedMessage = CryptoJS.AES.decrypt(
      mensagemData.texto,
      secretKey
    ).toString(CryptoJS.enc.Utf8);

    messageElement.textContent = decryptedMessage;
    chatMessages.appendChild(messageElement);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight; // Rolagem para o final
}

// Função para enviar uma mensagem
function enviarMensagem(message) {
  if (chatIdAtual === null) {
    console.error("Nenhum chat selecionado.");
    return;
  }

  const idUsuarioLogado = sessionStorage.getItem("id_usuario");
  const chatPath =
    idUsuarioLogado < chatIdAtual
      ? `${idUsuarioLogado}_${chatIdAtual}`
      : `${chatIdAtual}_${idUsuarioLogado}`;

  // Criptografa a mensagem
  const secretKey = "sua-chave-secreta"; // Substitua por uma chave segura
  const encryptedMessage = CryptoJS.AES.encrypt(message, secretKey).toString();

  const mensagensRef = ref(database, `mensagens/${chatPath}`);
  const newMessageRef = push(mensagensRef);
  set(newMessageRef, {
    id_mensagem: newMessageRef.key,
    id_usuario1: idUsuarioLogado,
    id_usuario2: chatIdAtual,
    texto: encryptedMessage, // Armazena a mensagem criptografada
  });
}

function mostrarConfirmacao(tipo, callback) {
  // Cria o modal
  const modal = document.createElement("div");
  modal.className = "modal";

  const modalContent = document.createElement("div");
  modalContent.className = "modal-content";

  const modalHeader = document.createElement("div");
  modalHeader.className = "modal-header";
  modalHeader.textContent = tipo === "delete" ? "Confirmar" : "Informação";

  const modalBody = document.createElement("div");
  modalBody.className = "modal-body";
  modalBody.textContent =
    tipo === "delete"
      ? "Você tem certeza que deseja apagar todas as mensagens deste chat?"
      : ""; // Remove a mensagem de sucesso

  const modalFooter = document.createElement("div");
  modalFooter.className = "modal-footer";

  const confirmButton = document.createElement("button");
  confirmButton.textContent = tipo === "delete" ? "Sim" : "Ok";
  confirmButton.className = "modal-button confirm";
  confirmButton.addEventListener("click", () => {
    callback();
    document.body.removeChild(modal);
  });

  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancelar";
  cancelButton.className = "modal-button cancel";
  cancelButton.addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  modalFooter.appendChild(confirmButton);
  if (tipo === "delete") modalFooter.appendChild(cancelButton);

  modalContent.appendChild(modalHeader);
  modalContent.appendChild(modalBody);
  modalContent.appendChild(modalFooter);
  modal.appendChild(modalContent);

  document.body.appendChild(modal);
}

function apagarMensagens(chatId) {
  mostrarConfirmacao("delete", () => {
    const idUsuarioLogado = sessionStorage.getItem("id_usuario");
    const chatPath =
      idUsuarioLogado < chatId
        ? `${idUsuarioLogado}_${chatId}`
        : `${chatId}_${idUsuarioLogado}`;

    const mensagensRef = ref(database, `mensagens/${chatPath}`);
    set(mensagensRef, null); // Remove todas as mensagens

    // Limpa as mensagens exibidas
    document.querySelector(".chat-messages").innerHTML = "";
  });
}

function inicializarChat() {
  document.addEventListener("DOMContentLoaded", () => {
    carregarChats();

    const chatList = document.querySelector(".chat-list");
    const deleteMessagesButton = document.getElementById(
      "delete-messages-button"
    );
    const chatOptions = document.getElementById("chat-options");
    const sendButton = document.getElementById("send-button");
    const messageInput = document.getElementById("message-input");

    let sendButtonListener = null; // Variável para armazenar o listener atual

    chatList.addEventListener("click", (event) => {
      if (event.target.classList.contains("chat-item")) {
        chatIdAtual = event.target.dataset.chatId;
        document.querySelector(".chat-header").textContent =
          event.target.textContent; // Apenas o nome do usuário
        carregarMensagens(chatIdAtual);

        const idUsuarioLogado = sessionStorage.getItem("id_usuario");
        console.log("ID do usuário logado:", idUsuarioLogado); // Adicione este log
        console.log("ID do admin:", ADMIN_ID); // Adicione este log

        if (idUsuarioLogado === ADMIN_ID) {
          chatOptions.style.display = "block";
          deleteMessagesButton.style.display = "block";
          deleteMessagesButton.onclick = () => apagarMensagens(chatIdAtual);
        } else {
          chatOptions.style.display = "none";
          deleteMessagesButton.style.display = "none";
        }

        // Remove o listener anterior do botão de envio, se existir
        if (sendButtonListener) {
          sendButton.removeEventListener("click", sendButtonListener);
        }

        // Configura o evento de enviar mensagem
        sendButtonListener = () => {
          const message = messageInput.value;
          if (message.trim() !== "") {
            enviarMensagem(message);
            messageInput.value = ""; // Limpar o campo de mensagem
          }
        };

        sendButton.addEventListener("click", sendButtonListener);

        // Adiciona evento para enviar mensagem com a tecla Enter
        messageInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            const message = messageInput.value;
            if (message.trim() !== "") {
              enviarMensagem(message);
              messageInput.value = ""; // Limpar o campo de mensagem
            }
          }
        });
      }
    });

    // Esconde o menu de opções quando o usuário clicar fora do item de chat
    document.addEventListener("click", (event) => {
      if (!event.target.classList.contains("chat-item")) {
        chatOptions.style.display = "none";
      }
    });
  });
}

inicializarChat();
