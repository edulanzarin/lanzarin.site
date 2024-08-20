import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  push,
  onValue,
  update,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
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

function truncarMensagem(mensagem, tamanhoMaximo) {
  if (mensagem.length > tamanhoMaximo) {
    return mensagem.substring(0, tamanhoMaximo) + "...";
  }
  return mensagem;
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
            const tamanhoMaximo = 50; // Defina o tamanho máximo desejado

            messageDiv.textContent = ultimaMensagem
              ? truncarMensagem(ultimaMensagem.conteudo, tamanhoMaximo)
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

document.addEventListener("DOMContentLoaded", () => {
  const profileButton = document.getElementById("profileButton");
  const profileModal = document.getElementById("profileModal");
  const closeModal = document.getElementById("closeModal");
  const fileInput = document.getElementById("fileInput");
  const modalPhotoButton = document.querySelector(".modal-photo-button");
  const profileImage = document.getElementById("profileImage");
  const contactIdInput = document.getElementById("contactName");
  const modalAddContactButton = document.getElementById(
    "modalAddContactButton"
  );
  const modalTitle = document.getElementById("modalTitle");

  // Verifica se os elementos existem
  if (
    profileButton &&
    profileModal &&
    closeModal &&
    fileInput &&
    modalPhotoButton &&
    profileImage &&
    contactIdInput &&
    modalAddContactButton &&
    modalTitle
  ) {
    // Mostra o modal quando o botão de perfil é clicado
    profileButton.addEventListener("click", () => {
      const idUsuarioLogado = sessionStorage.getItem("id_usuario");
      if (idUsuarioLogado) {
        modalTitle.textContent = `${idUsuarioLogado}`; // Define o título do modal
      } else {
        console.error("ID do usuário logado não encontrado.");
      }
      profileModal.style.display = "flex"; // Mostra o modal
    });

    // Fecha o modal quando o botão de fechar é clicado
    closeModal.addEventListener("click", () => {
      profileModal.style.display = "none"; // Oculta o modal
    });

    // Fecha o modal se o usuário clicar fora dele
    window.addEventListener("click", (event) => {
      if (event.target === profileModal) {
        profileModal.style.display = "none";
      }
    });

    // Abre o seletor de arquivos quando a imagem no modal for clicada
    modalPhotoButton.addEventListener("click", () => {
      fileInput.click(); // Abre o seletor de arquivos
    });

    // Atualiza a imagem de perfil com a nova foto selecionada e faz o upload
    fileInput.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (file) {
        const idUsuarioLogado = sessionStorage.getItem("id_usuario");
        if (!idUsuarioLogado) {
          console.error("ID do usuário logado não encontrado.");
          return;
        }

        try {
          const nomeAleatorio = `${Date.now()}_${file.name}`;
          const fotoRef = storageRef(storage, `fotos_perfil/${nomeAleatorio}`);

          const uploadTask = uploadBytesResumable(fotoRef, file);

          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress =
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`Upload is ${progress}% done`);
            },
            (error) => {
              console.error("Erro ao fazer upload da imagem:", error);
            },
            async () => {
              try {
                const url = await getDownloadURL(fotoRef);

                modalPhotoButton.src = url;
                profileImage.src = url;

                const usuarioRef = ref(database, `contatos/${idUsuarioLogado}`);
                await update(usuarioRef, { foto: nomeAleatorio });

                console.log("Imagem de perfil atualizada com sucesso.");
                profileModal.style.display = "none"; // Fecha o modal após o upload
              } catch (error) {
                console.error("Erro ao obter a URL da imagem:", error);
              }
            }
          );
        } catch (error) {
          console.error("Erro ao atualizar a imagem de perfil:", error);
        }
      }
    });

    // Adiciona contato diretamente pelo ID
    modalAddContactButton.addEventListener("click", () => {
      const contactId = contactIdInput.value;
      if (contactId) {
        adicionarContato(contactId);
        contactIdInput.value = ""; // Limpa o campo após adicionar
        profileModal.style.display = "none"; // Fecha o modal após adicionar contato
      } else {
        console.error("ID do contato não fornecido.");
      }
    });
  } else {
    console.error("Um ou mais elementos não foram encontrados.");
  }
});

// Função para carregar a imagem de perfil do usuário logado
async function carregarImagemPerfil() {
  try {
    const idUsuarioLogado = sessionStorage.getItem("id_usuario");
    if (!idUsuarioLogado) {
      throw new Error("ID do usuário logado não encontrado.");
    }

    const usuarioRef = ref(database, `contatos/${idUsuarioLogado}`);
    const snapshot = await get(usuarioRef);

    if (!snapshot.exists()) {
      console.error("Usuário não encontrado.");
      return;
    }

    const usuarioData = snapshot.val();
    const fotoNome = usuarioData.foto;

    if (fotoNome) {
      const fotoRef = storageRef(storage, `fotos_perfil/${fotoNome}`);
      try {
        const url = await getDownloadURL(fotoRef);

        document.getElementById("profileImage").src = url;
        document.getElementById("modalProfileImage").src = url;
      } catch (error) {
        console.error("Erro ao carregar a foto de perfil:", error);
      }
    }
  } catch (error) {
    console.error("Erro ao carregar a imagem de perfil:", error);
  }
}

// Carregar a imagem de perfil na inicialização
document.addEventListener("DOMContentLoaded", carregarImagemPerfil);

// Função para adicionar contato
async function adicionarContato(idContato) {
  const idUsuarioLogado = sessionStorage.getItem("id_usuario");
  if (!idUsuarioLogado) {
    console.error("ID do usuário logado não encontrado.");
    return;
  }

  try {
    // Referência para o nó de contatos comuns do usuário
    const contatosComunsRef = ref(
      database,
      `contatos_comuns/${idUsuarioLogado}`
    );

    // Adiciona o ID do contato ao nó de contatos comuns
    await update(contatosComunsRef, {
      [idContato]: true, // Adiciona o ID do contato com valor true
    });

    console.log(`Contato ${idContato} adicionado aos contatos comuns.`);
  } catch (error) {
    console.error("Erro ao adicionar o contato:", error);
  }
}
