import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  push,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);

const ADMIN_ID = "r8qE9f7JkL1Pz2Tn0vWx";
let chatIdAtual = null;

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
      chatList.innerHTML = "";

      snapshot.forEach((childSnapshot) => {
        const userId = childSnapshot.key;
        const userData = childSnapshot.val();

        if (idUsuarioLogado === ADMIN_ID || userId === ADMIN_ID) {
          if (userId !== idUsuarioLogado) {
            const chatItem = document.createElement("li");
            chatItem.className = "chat-item";
            chatItem.dataset.chatId = userId;
            chatItem.textContent = userData.nome;
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

function carregarMensagens(chatId) {
  const idUsuarioLogado = sessionStorage.getItem("id_usuario");
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
    mostrarMensagens(mensagens, idUsuarioLogado, chatPath);
  });
}

function mostrarMensagens(mensagens, idUsuarioLogado, chatPath) {
  const chatMessages = document.querySelector(".chat-messages");
  chatMessages.innerHTML = "";

  mensagens.sort((a, b) => (a.id_mensagem > b.id_mensagem ? 1 : -1));

  mensagens.forEach((mensagemData) => {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${
      mensagemData.id_usuario1 === idUsuarioLogado ? "sent" : "received"
    }`;

    const secretKey = "duduzin";
    const decryptedMessage = CryptoJS.AES.decrypt(
      mensagemData.texto,
      secretKey
    ).toString(CryptoJS.enc.Utf8);

    if (decryptedMessage.trim() !== "") {
      const messageText = document.createElement("p");
      messageText.textContent = decryptedMessage;
      messageElement.appendChild(messageText);
    }

    if (mensagemData.arquivo) {
      const fileCard = document.createElement("div");
      fileCard.className = "file-card";

      const fileExtension = mensagemData.arquivo.split(".").pop().toLowerCase();
      if (
        fileExtension === "png" ||
        fileExtension === "jpg" ||
        fileExtension === "jpeg"
      ) {
        const fileImage = document.createElement("img");
        const fileUrl = `https://firebasestorage.googleapis.com/v0/b/lanzarin-site.appspot.com/o/${encodeURIComponent(
          chatPath + "/" + mensagemData.arquivo
        )}?alt=media`;

        fileImage.src = fileUrl;
        fileImage.alt = "Imagem";
        fileImage.style.cursor = "pointer";
        fileImage.style.maxWidth = "300px"; // Ajuste o tamanho conforme necessário
        fileImage.style.maxHeight = "300px"; // Ajuste o tamanho conforme necessário
        fileImage.addEventListener("click", () => {
          const imgPopup = document.createElement("div");
          imgPopup.className = "image-popup";
          const img = document.createElement("img");
          img.src = fileUrl;
          img.style.maxWidth = "90%";
          img.style.maxHeight = "80%";
          imgPopup.appendChild(img);
          imgPopup.addEventListener("click", () => {
            document.body.removeChild(imgPopup);
          });
          document.body.appendChild(imgPopup);
        });

        fileCard.appendChild(fileImage);
      } else {
        const fileIcon = document.createElement("img");
        fileIcon.src = "img/file.png";
        fileIcon.alt = "Arquivo";
        fileCard.appendChild(fileIcon);

        const fileName = document.createElement("p");
        fileName.textContent = mensagemData.arquivo;
        fileCard.appendChild(fileName);
      }

      messageElement.appendChild(fileCard);
    }

    chatMessages.appendChild(messageElement);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.addEventListener("paste", async (event) => {
  if (event.clipboardData && event.clipboardData.items) {
    const items = event.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          // Exibe o preview da imagem
          mostrarImagemPreview(file);
          // Atualiza o input de arquivos para incluir o arquivo
          document.getElementById("file-input").files =
            event.clipboardData.files;
        }
      }
    }
  }
});

async function enviarMensagem(message, file) {
  if (chatIdAtual === null) {
    console.error("Nenhum chat selecionado.");
    return;
  }

  const idUsuarioLogado = sessionStorage.getItem("id_usuario");
  const chatPath =
    idUsuarioLogado < chatIdAtual
      ? `${idUsuarioLogado}_${chatIdAtual}`
      : `${chatIdAtual}_${idUsuarioLogado}`;

  const secretKey = "duduzin";
  const encryptedMessage = CryptoJS.AES.encrypt(message, secretKey).toString();

  const mensagensRef = ref(database, `mensagens/${chatPath}`);
  const newMessageRef = push(mensagensRef);

  let fileId = null;
  if (file) {
    fileId = await enviarArquivo(file);
  }

  await set(newMessageRef, {
    id_mensagem: newMessageRef.key,
    id_usuario1: idUsuarioLogado,
    id_usuario2: chatIdAtual,
    texto: encryptedMessage,
    arquivo: fileId, // Armazena o ID do arquivo
  });

  // Limpar a visualização após o envio
  removerImagemPreview();
}

function gerarUUID() {
  // Função para gerar UUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function enviarArquivo(file) {
  const allowedTypes = ["image/png", "image/jpeg"];

  if (!allowedTypes.includes(file.type)) {
    console.error(
      "Tipo de arquivo não permitido. Apenas PNG e JPG são aceitos."
    );
    return null;
  }

  const userId = sessionStorage.getItem("id_usuario");
  const chatPath =
    userId < chatIdAtual
      ? `${userId}_${chatIdAtual}`
      : `${chatIdAtual}_${userId}`;

  // Gerar um UUID para garantir um nome único
  const fileId = gerarUUID();
  const fileExtension = file.name.split(".").pop();
  const newFileName = `${fileId}.${fileExtension}`;

  const fileRef = storageRef(storage, `${chatPath}/${newFileName}`);

  try {
    await uploadBytes(fileRef, file);
    return newFileName; // Retorna o novo nome do arquivo como ID
  } catch (error) {
    console.error("Erro ao enviar arquivo:", error.message);
    return null;
  }
}

function mostrarConfirmacao(tipo, callback) {
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
      : "";

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
  mostrarConfirmacao("delete", async () => {
    const idUsuarioLogado = sessionStorage.getItem("id_usuario");
    const chatPath =
      idUsuarioLogado < chatId
        ? `${idUsuarioLogado}_${chatId}`
        : `${chatId}_${idUsuarioLogado}`;

    const mensagensRef = ref(database, `mensagens/${chatPath}`);
    await set(mensagensRef, null);

    document.querySelector(".chat-messages").innerHTML = "";
  });
}

// Função para mostrar o ícone e o nome da imagem
function mostrarImagemPreview(file) {
  const previewContainer = document.querySelector(".image-preview-container");
  previewContainer.innerHTML = ""; // Limpa o conteúdo existente

  const img = document.createElement("img");
  img.src = URL.createObjectURL(file); // Cria URL para visualização local
  img.alt = "Imagem";
  img.style.maxWidth = "200px"; // Ajusta o tamanho conforme necessário
  img.style.maxHeight = "200px"; // Ajusta o tamanho conforme necessário

  const fileName = document.createElement("span");
  fileName.className = "image-name";
  fileName.textContent = file.name || "Print"; // Usa nome padrão se não houver nome

  previewContainer.appendChild(img);
  previewContainer.appendChild(fileName);

  // Mostrar o botão de remover
  const removeButton = document.getElementById("remove-preview-button");
  if (removeButton) {
    removeButton.style.display = "block";
  }
}

// Função para remover o preview da imagem
function removerImagemPreview() {
  const previewContainer = document.querySelector(".image-preview-container");
  previewContainer.innerHTML = ""; // Limpa a visualização da imagem

  // Ocultar o botão de remover
  const removeButton = document.getElementById("remove-preview-button");
  if (removeButton) {
    removeButton.style.display = "none";
  }
}

// Adiciona o evento de clique ao botão de remover imagem
document
  .getElementById("remove-preview-button")
  .addEventListener("click", removerImagemPreview);

// Adiciona o evento de mudança no input de arquivos
document.getElementById("file-input").addEventListener("change", (event) => {
  const files = event.target.files;
  if (files.length > 0) {
    mostrarImagemPreview(files[0]); // Mostra o ícone e o nome do primeiro arquivo selecionado
  } else {
    removerImagemPreview(); // Remove a visualização se nenhum arquivo for selecionado
  }
});

function adicionarOuvinteEnviar() {
  const sendButton = document.getElementById("send-button");
  const messageInput = document.getElementById("message-input");
  const fileInput = document.getElementById("file-input");

  function enviarMensagemHandler() {
    const message = messageInput.value;
    const file = fileInput.files[0];

    if (message.trim() !== "" || file) {
      enviarMensagem(message, file).then(() => {
        messageInput.value = "";
        fileInput.value = "";
        removerImagemPreview(); // Limpa a visualização após o envio
      });
    }
  }

  // Remove qualquer ouvinte de clique anterior antes de adicionar um novo
  sendButton.removeEventListener("click", enviarMensagemHandler);
  sendButton.addEventListener("click", enviarMensagemHandler);

  // Remove qualquer ouvinte de tecla Enter anterior antes de adicionar um novo
  messageInput.removeEventListener("keydown", enviarMensagemHandler);
  messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      enviarMensagemHandler();
    }
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

    chatList.addEventListener("click", (event) => {
      if (event.target.classList.contains("chat-item")) {
        chatIdAtual = event.target.dataset.chatId;
        document.querySelector(".chat-header").textContent =
          event.target.textContent;
        carregarMensagens(chatIdAtual);

        const idUsuarioLogado = sessionStorage.getItem("id_usuario");
        console.log("ID do usuário logado:", idUsuarioLogado);
        console.log("ID do admin:", ADMIN_ID);

        if (idUsuarioLogado === ADMIN_ID) {
          chatOptions.style.display = "block";
          deleteMessagesButton.style.display = "block";
          deleteMessagesButton.onclick = () => apagarMensagens(chatIdAtual);
        } else {
          chatOptions.style.display = "none";
          deleteMessagesButton.style.display = "none";
        }

        adicionarOuvinteEnviar();
      }
    });

    document.addEventListener("click", (event) => {
      if (!event.target.classList.contains("chat-item")) {
        chatOptions.style.display = "none";
      }
    });
  });
}

inicializarChat();
