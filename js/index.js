import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  push,
  onValue, // Importa a função onValue
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import {
  getStorage,
  ref as storageRef,
  getDownloadURL,
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

// Gera um ID de conversa consistente
function gerarIdConversa(id1, id2) {
  return id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
}

async function carregarContatos() {
  try {
    const idUsuarioLogado = sessionStorage.getItem("id_usuario");
    if (!idUsuarioLogado) {
      window.location.href = "login.html";
      return;
    }

    // Referência ao nó de contatos comuns do usuário
    const contatosComunsRef = ref(
      database,
      `contatos_comuns/${idUsuarioLogado}`
    );
    const snapshot = await get(contatosComunsRef);

    if (!snapshot.exists()) {
      console.log("Nenhum contato comum encontrado.");
      return;
    }

    const contatosComuns = snapshot.val();
    const container = document.querySelector(".contacts");
    container.innerHTML = '<i class="fas fa-bars fa-2x"></i><h2>Contatos</h2>';

    for (const [id, dados] of Object.entries(contatosComuns)) {
      const contatoRef = ref(database, `contatos/${id}`);
      const contatoSnapshot = await get(contatoRef);

      if (contatoSnapshot.exists()) {
        const { nome, foto } = contatoSnapshot.val();
        const contatoDiv = document.createElement("div");
        contatoDiv.classList.add("contact");
        contatoDiv.dataset.id = id; // Armazena o ID do contato

        const picDiv = document.createElement("div");
        picDiv.classList.add("pic");
        picDiv.setAttribute("data-id", id);

        if (foto) {
          const fotoRef = storageRef(storage, `fotos_perfil/${foto}`);
          try {
            const url = await getDownloadURL(fotoRef);
            picDiv.style.backgroundImage = `url(${url})`;
          } catch (error) {
            console.log("Erro ao carregar a foto:", error);
            picDiv.style.backgroundImage = `url('url-da-imagem-padrao')`;
          }
        }

        const badgeDiv = document.createElement("div");

        const nameDiv = document.createElement("div");
        nameDiv.classList.add("name");
        nameDiv.textContent = nome;

        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message");

        // Atualizar a última mensagem em tempo real
        const idConversa = gerarIdConversa(idUsuarioLogado, id);
        const conversasRef = ref(database, `conversas/${idConversa}`);

        onValue(conversasRef, (snapshot) => {
          if (snapshot.exists()) {
            const conversas = snapshot.val();
            const mensagens = Object.values(conversas);
            const ultimaMensagem = mensagens[mensagens.length - 1];
            messageDiv.textContent = ultimaMensagem
              ? ultimaMensagem.conteudo
              : "Sem mensagens ainda.";
          } else {
            messageDiv.textContent = "Sem mensagens ainda.";
          }
        });

        contatoDiv.appendChild(picDiv);
        contatoDiv.appendChild(badgeDiv);
        contatoDiv.appendChild(nameDiv);
        contatoDiv.appendChild(messageDiv);

        contatoDiv.addEventListener("click", () =>
          abrirConversa(id, nome, foto)
        );

        container.appendChild(contatoDiv);
      }
    }
  } catch (error) {
    console.error("Erro ao carregar contatos:", error);
    window.location.href = "login.html";
  }
}

// Formata a data como "dd/MM/yyyy"
function formatarData(timestamp) {
  const data = new Date(timestamp);
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

// Formata a hora como "HH:mm"
function formatarHora(timestamp) {
  const data = new Date(timestamp);
  const horas = String(data.getHours()).padStart(2, "0");
  const minutos = String(data.getMinutes()).padStart(2, "0");
  return `${horas}:${minutos}`;
}

async function abrirConversa(id, nome, foto) {
  const idUsuarioLogado = sessionStorage.getItem("id_usuario");
  if (!idUsuarioLogado) {
    console.error("ID do usuário logado não encontrado.");
    return;
  }

  const contactBar = document.querySelector(".chat .contact.bar");
  const messagesContainer = document.querySelector(".messages");

  contactBar.querySelector(".name").textContent = nome;
  contactBar.querySelector(".pic").dataset.id = id; // Salva o ID do contato clicado
  if (foto) {
    const fotoRef = storageRef(storage, `fotos_perfil/${foto}`);
    try {
      const url = await getDownloadURL(fotoRef);
      contactBar.querySelector(".pic").style.backgroundImage = `url(${url})`;
    } catch (error) {
      console.log("Erro ao carregar a foto:", error);
    }
  } else {
    contactBar.querySelector(".pic").style.backgroundImage = "";
  }

  const mensagensRef = ref(
    database,
    `conversas/${gerarIdConversa(idUsuarioLogado, id)}`
  );

  // Ouvir atualizações em tempo real para as mensagens
  onValue(mensagensRef, (snapshot) => {
    messagesContainer.innerHTML = "";
    if (snapshot.exists()) {
      const mensagens = snapshot.val();
      let ultimaData = null;
      for (const msg of Object.values(mensagens)) {
        const dataMensagem = formatarData(msg.timestamp);
        const horaMensagem = formatarHora(msg.timestamp);

        // Verifica se é a primeira mensagem do dia
        if (dataMensagem !== ultimaData) {
          const dataDiv = document.createElement("div");
          dataDiv.classList.add("date-separator");
          dataDiv.textContent = dataMensagem;
          messagesContainer.appendChild(dataDiv);
          ultimaData = dataMensagem;
        }

        const msgDiv = document.createElement("div");
        msgDiv.classList.add("message", msg.from === id ? "stark" : "parker");
        msgDiv.innerHTML = `<span class="message-content">${msg.conteudo}</span><span class="message-time">${horaMensagem}</span>`;
        messagesContainer.appendChild(msgDiv);
      }
    } else {
      messagesContainer.innerHTML = "<p>Sem mensagens ainda.</p>";
    }
    messagesContainer.scrollTop = messagesContainer.scrollHeight; // Rola para o final
  });
}

// Função para enviar a mensagem
async function enviarMensagem(conteudo) {
  const idUsuarioLogado = sessionStorage.getItem("id_usuario");
  const idContato = document.querySelector(".chat .contact.bar .pic").dataset
    .id;

  if (!idUsuarioLogado || !idContato) {
    console.error("ID do usuário ou do contato não encontrado.");
    return;
  }

  const idConversa = gerarIdConversa(idUsuarioLogado, idContato);
  const mensagensRef = ref(database, `conversas/${idConversa}`);
  const novaMensagemRef = push(mensagensRef); // Gera uma nova referência para a mensagem

  const mensagem = {
    id: novaMensagemRef.key,
    conteudo: conteudo,
    from: idUsuarioLogado,
    to: idContato,
    timestamp: Date.now(),
  };

  try {
    await set(novaMensagemRef, mensagem);
    console.log("Mensagem enviada com sucesso.");
    // A interface será atualizada em tempo real pelo listener onValue
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
  }
}

// Evento para enviar a mensagem quando o usuário pressiona Enter
document.querySelector(".input input").addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    const conteudo = event.target.value;
    if (conteudo.trim()) {
      enviarMensagem(conteudo);
      event.target.value = "";
    }
  }
});

// Carregar contatos na inicialização
carregarContatos();

document.addEventListener("DOMContentLoaded", () => {
  const emojiButton = document.querySelector(".fa-laugh-beam");
  const emojiPicker = document.querySelector(".emoji-picker");
  const inputField = document.querySelector(".input input");

  // Mostrar/Esconder o seletor de emojis ao clicar no ícone de emoji
  emojiButton.addEventListener("click", () => {
    emojiPicker.style.display =
      emojiPicker.style.display === "none" ? "flex" : "none";
  });

  // Inserir o emoji selecionado no campo de entrada
  emojiPicker.addEventListener("click", (event) => {
    if (event.target.classList.contains("emoji")) {
      const emoji = event.target.dataset.emoji;
      inputField.value += emoji;
      emojiPicker.style.display = "none"; // Esconde o seletor de emojis após seleção
    }
  });

  // Esconder o seletor de emojis se clicar fora dele
  document.addEventListener("click", (event) => {
    if (
      !emojiPicker.contains(event.target) &&
      !emojiButton.contains(event.target)
    ) {
      emojiPicker.style.display = "none";
    }
  });
});
