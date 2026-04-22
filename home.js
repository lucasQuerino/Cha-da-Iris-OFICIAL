import { db } from './firebase.js';
import { ref, onValue, set, get, update } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";

// =============================================
// LISTA DE CONVIDADOS — carregada do Firebase
// =============================================
// Iniciamos com a lista padrão como fallback. O Firebase sobrescreve ao carregar.
let convidadosOficiais = [
    "Lucas", "Izabelle", "Jane", "Clovis", "Willian", "Adriana", "Wendel", "Claudia", "Gabriel",
    "Deise", "Bryan", "Bento", "Zezita", "Talita", "Jorge", "Luan", "Maria Zilmar", "Braz",
    "Patrícia", "Camila", "Letícia", "Arthur", "Edmilson", "Gabrielle", "Nicollas", "Maria",
    "Patrick", "Jeniffer Cosso", "Hugo", "Nicolle", "Kayky", "João", "Marilza Midori",
    "Rogerio Carmo", "Guilherme Shoji", "Vinicius Takeshi", "Diego Kioshi"
];

// Sincroniza lista com Firebase (lê uma vez no carregamento)
get(ref(db, 'listaOficial')).then((snapshot) => {
    if (snapshot.val() && Array.isArray(snapshot.val())) {
        convidadosOficiais = snapshot.val();
    }
}).catch(() => {});

// =============================================
// VARIÁVEIS GLOBAIS
// =============================================
// Carrinho: { key: { nome, quantidade, icone } }
let carrinho = {};
let produtosListenerSetup = false;

// =============================================
// FOTO DA IRIS
// =============================================
get(ref(db, 'irisImage')).then((snapshot) => {
    const url = snapshot.val()?.url;
    if (url) {
        const img = document.getElementById('iris-foto');
        const placeholder = document.getElementById('hero-placeholder');
        if (img) {
            img.onload = () => {
                img.classList.add('loaded');
                if (placeholder) placeholder.classList.add('hidden');
            };
            img.onerror = () => {
                img.style.display = 'none';
                if (placeholder) placeholder.classList.remove('hidden');
            };
            img.src = url;
        }
    }
}).catch(() => {});

// =============================================
// CARDS DINÂMICOS
// =============================================
// Aplica estilo de um card via CSS custom properties — garante estabilidade
// mesmo após repaint, sem conflito com pseudoelementos do CSS.
function aplicarEstiloCard(num, cardData) {
    const header = document.getElementById(`card${num}-header`);
    if (!header) return;

    const cor      = cardData.cor      || '#2d5a3d';
    const cor2     = cardData.cor2     || '#4a7c59';
    const corTexto = cardData.corTexto || '#e8c96a';

    // Injeta as cores como custom properties no elemento:
    // o CSS usa var(--card-cor1) etc., garantindo que não há conflito
    header.style.setProperty('--card-cor1',   cor);
    header.style.setProperty('--card-cor2',   cor2);
    header.style.setProperty('--card-texto',  corTexto);
    // Aplica background e color diretamente também (fallback duplo)
    header.style.background = `linear-gradient(135deg, ${cor} 0%, ${cor2} 100%)`;
    header.style.color       = corTexto;

    // Garante que título e ornamentos herdam a cor do texto
    header.querySelectorAll('.titulo-principal, .ornament').forEach(el => {
        el.style.color = corTexto;
    });
}

function aplicarTextosCard(num, cardData) {
    const titulo   = document.getElementById(`card${num}-titulo`);
    const texto    = document.getElementById(`card${num}-texto`);
    const subtitulo = document.getElementById(`card${num}-subtitulo`);

    if (titulo)   titulo.innerText   = cardData.titulo   || '';
    if (texto)    texto.innerText    = cardData.texto     || '';
    if (subtitulo) subtitulo.innerText = cardData.subtitulo || '';
}

get(ref(db, 'configCards')).then((snapshot) => {
    const config = snapshot.val() || {};

    [1, 2, 3].forEach(num => {
        const card = config[`card${num}`];
        if (!card) return;
        aplicarTextosCard(num, card);
        aplicarEstiloCard(num, card);
    });
}).catch(() => {});

// =============================================
// CARRINHO — RENDERIZAÇÃO DO BANNER
// =============================================
function renderCarrinho() {
    const banner = document.getElementById('produto-selecionado-banner');
    const el = document.getElementById('produto-selecionado');
    const itens = Object.values(carrinho);

    if (itens.length === 0) {
        if (banner) banner.style.display = 'none';
        if (el) el.innerHTML = '';
        return;
    }

    if (banner) banner.style.display = 'flex';
    if (el) {
        el.innerHTML = itens.map(item =>
            `<span class="carrinho-item-tag">
                ${item.icone || '🎁'} ${item.nome}
                <span class="carrinho-qtd-ctrl">
                    <button class="carrinho-qtd-btn" onclick="window.alterarQtd('${item.key}', -1)">−</button>
                    <span class="carrinho-qtd-num">${item.quantidade}</span>
                    <button class="carrinho-qtd-btn" onclick="window.alterarQtd('${item.key}', 1)">+</button>
                </span>
                <button class="carrinho-remove-btn" onclick="window.removerDoCarrinho('${item.key}')" title="Remover">✕</button>
            </span>`
        ).join('');
    }
}

// =============================================
// PRODUTOS / ESTOQUE (tempo real)
// =============================================
// Guarda estoque atual em memória para controle de quantidade
let estoqueAtualCache = {};

function renderProdutos() {
    if (produtosListenerSetup) return;
    produtosListenerSetup = true;

    onValue(ref(db, 'estoque'), (snapshot) => {
        const produtos = snapshot.val() || {};
        estoqueAtualCache = produtos;
        const grid = document.getElementById('grid-produtos-estoque');
        if (!grid) return;
        grid.innerHTML = '';

        Object.entries(produtos).forEach(([key, p]) => {
            const estoque = p.estoque || 0;
            const noCarrinho = carrinho[key]?.quantidade || 0;
            const disponivel = estoque - noCarrinho;

            let statusClass = 'estoque-disponivel';
            let statusText = `✅ ${estoque} disponível${estoque !== 1 ? 'is' : ''}`;

            if (estoque === 0) {
                statusClass = 'estoque-esgotado';
                statusText = '❌ Esgotado';
            } else if (estoque <= 2) {
                statusClass = 'estoque-baixo';
                statusText = `⚠️ ${estoque} restante${estoque !== 1 ? 's' : ''}`;
            }

            const noCarrinhoTag = noCarrinho > 0
                ? `<span class="no-carrinho-badge">🛒 ${noCarrinho} no carrinho</span>`
                : '';

            const card = document.createElement('div');
            card.className = `produto-card-moderno ${estoque === 0 ? 'esgotado' : ''} ${noCarrinho > 0 ? 'no-carrinho' : ''}`;
            card.id = `produto-card-${key}`;
            card.innerHTML = `
                <div class="produto-icon-wrapper">${p.icone || '🎁'}</div>
                <div class="produto-info">
                    <h6>${p.nome || 'Produto'}</h6>
                    <div class="estoque-status ${statusClass}">${statusText}</div>
                    ${noCarrinhoTag}
                </div>
                <div class="produto-acoes">
                    <div class="qtd-seletor ${estoque === 0 ? 'hidden' : ''}">
                        <button class="qtd-btn" onclick="window.mudarQtdProduto('${key}', -1)" ${disponivel <= 0 && noCarrinho === 0 ? 'disabled' : ''}>−</button>
                        <span class="qtd-valor" id="qtd-${key}">${noCarrinho}</span>
                        <button class="qtd-btn" onclick="window.mudarQtdProduto('${key}', 1)" ${disponivel <= 0 ? 'disabled' : ''}>+</button>
                    </div>
                    <button class="btn-selecionar-produto ${noCarrinho > 0 ? 'no-carrinho' : ''}" data-key="${key}" data-nome="${p.nome}" ${estoque === 0 ? 'disabled' : ''}>
                        ${estoque === 0 ? 'Esgotado' : noCarrinho > 0 ? '✓ Adicionado' : 'Presentear'}
                    </button>
                </div>
            `;

            const btn = card.querySelector('.btn-selecionar-produto');
            if (btn && estoque > 0) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (noCarrinho === 0) {
                        adicionarAoCarrinho(key, p.nome, p.icone || '🎁', 1);
                    }
                });
            }

            grid.appendChild(card);
        });
    });
}

// =============================================
// GERENCIAMENTO DO CARRINHO
// =============================================
function adicionarAoCarrinho(key, nome, icone, quantidade) {
    const estoque = estoqueAtualCache[key]?.estoque || 0;
    const qtdAtual = carrinho[key]?.quantidade || 0;
    const novaQtd = qtdAtual + quantidade;

    if (novaQtd > estoque) {
        alert(`⚠️ Estoque insuficiente! Disponível: ${estoque - qtdAtual}`);
        return;
    }
    if (novaQtd <= 0) {
        delete carrinho[key];
    } else {
        carrinho[key] = { key, nome, icone, quantidade: novaQtd };
    }
    renderCarrinho();
    atualizarCardProduto(key);
}

window.mudarQtdProduto = (key, delta) => {
    const p = estoqueAtualCache[key];
    if (!p) return;
    const qtdAtual = carrinho[key]?.quantidade || 0;
    const novaQtd = qtdAtual + delta;

    if (novaQtd > p.estoque) {
        alert(`⚠️ Estoque insuficiente! Máximo: ${p.estoque}`);
        return;
    }
    if (novaQtd <= 0) {
        delete carrinho[key];
    } else {
        carrinho[key] = { key, nome: p.nome, icone: p.icone || '🎁', quantidade: novaQtd };
    }
    renderCarrinho();
    atualizarCardProduto(key);
};

window.alterarQtd = (key, delta) => {
    window.mudarQtdProduto(key, delta);
};

window.removerDoCarrinho = (key) => {
    delete carrinho[key];
    renderCarrinho();
    atualizarCardProduto(key);
};

function atualizarCardProduto(key) {
    const card = document.getElementById(`produto-card-${key}`);
    if (!card) return;
    const p = estoqueAtualCache[key];
    if (!p) return;

    const estoque = p.estoque || 0;
    const noCarrinho = carrinho[key]?.quantidade || 0;
    const disponivel = estoque - noCarrinho;

    const qtdEl = card.querySelector(`#qtd-${key}`);
    if (qtdEl) qtdEl.textContent = noCarrinho;

    const btn = card.querySelector('.btn-selecionar-produto');
    if (btn) {
        btn.textContent = estoque === 0 ? 'Esgotado' : noCarrinho > 0 ? '✓ Adicionado' : 'Presentear';
        btn.classList.toggle('no-carrinho', noCarrinho > 0);
    }

    card.classList.toggle('no-carrinho', noCarrinho > 0);

    const badgeEl = card.querySelector('.no-carrinho-badge');
    if (badgeEl) {
        badgeEl.textContent = noCarrinho > 0 ? `🛒 ${noCarrinho} no carrinho` : '';
        badgeEl.style.display = noCarrinho > 0 ? '' : 'none';
    }

    const btnMenos = card.querySelector('.qtd-btn:first-child');
    const btnMais = card.querySelector('.qtd-btn:last-child');
    if (btnMenos) btnMenos.disabled = noCarrinho <= 0;
    if (btnMais) btnMais.disabled = disponivel <= 0;
}

window.limparPresente = () => {
    carrinho = {};
    renderCarrinho();
    // Atualizar todos os cards do carrinho
    Object.keys(estoqueAtualCache).forEach(key => atualizarCardProduto(key));
};

// =============================================
// CONFIRMAÇÃO DE PRESENÇA
// =============================================
window.confirmarPresenca = async () => {
    const nome = document.getElementById('name')?.value?.trim() || '';
    const email = document.getElementById('email')?.value?.trim() || '';
    const whatsapp = document.getElementById('tel')?.value?.trim() || '';
    const acompanhantesInputs = document.querySelectorAll('.acompanhante-input');

    if (!nome || !email || !whatsapp) {
        alert('❌ Preencha todos os campos obrigatórios!');
        return;
    }

    const nomeNormalizado = nome.toLowerCase().trim();
    let convidadoEncontrado = null;

    for (const convidado of convidadosOficiais) {
        const nomes = convidado.toLowerCase().split(' ');
        const inputNomes = nomeNormalizado.split(' ').filter(n => n.length > 2);

        if (nomes.some(n => inputNomes.some(in_ => in_.includes(n) || n.includes(in_)))) {
            convidadoEncontrado = convidado;
            break;
        }
    }

    if (!convidadoEncontrado) {
        alert('❌ Nome não encontrado na lista de convidados.');
        return;
    }

    try {
        const acompanhantes = [];
        acompanhantesInputs.forEach(input => {
            const nomeAcomp = input.value.trim();
            const tipoAcomp = input.dataset.tipo;
            if (nomeAcomp) {
                acompanhantes.push({ nome: nomeAcomp, tipo: tipoAcomp });
            }
        });

        // Monta resumo dos presentes do carrinho
        const itensCarrinho = Object.values(carrinho);
        const presentesResumo = itensCarrinho.length > 0
            ? itensCarrinho.map(i => `${i.nome} (x${i.quantidade})`).join(', ')
            : 'Nenhum';

        const convidadoData = {
            email,
            whatsapp,
            presente: presentesResumo,
            acompanhantes
        };

        await set(ref(db, `convidados/${convidadoEncontrado}`), convidadoData);

        // Decrementa estoque de cada item no carrinho
        for (const [key, item] of Object.entries(carrinho)) {
            const produtoRef = ref(db, `estoque/${key}`);
            const snapshot = await get(produtoRef);
            const estoqueAtual = snapshot.val()?.estoque || 0;
            const novoEstoque = Math.max(0, estoqueAtual - item.quantidade);
            await update(produtoRef, { estoque: novoEstoque });
        }

        alert('🎉 Presença confirmada com sucesso!');
        document.getElementById('name').value = '';
        document.getElementById('email').value = '';
        document.getElementById('tel').value = '';
        carrinho = {};
        renderCarrinho();
        document.getElementById('acompanhanteBox').innerHTML = '';

    } catch (e) {
        alert('❌ Erro ao confirmar: ' + e.message);
    }
};

// =============================================
// ACOMPANHANTES
// =============================================
const btnAdicionar = document.querySelector('.btnAdcAcompanhante');
const boxAcompanhantes = document.querySelector('#acompanhanteBox');

if (btnAdicionar && boxAcompanhantes) {
    btnAdicionar.addEventListener('click', () => {
        const novoAcompanhante = document.createElement('div');
        novoAcompanhante.classList.add('dadosAcompanhantes');

        novoAcompanhante.innerHTML = `
            <select class="selectAcompanhante acompanhante-tipo" onchange="this.nextElementSibling.dataset.tipo = this.value">
                <option value="adulto">Adulto</option>
                <option value="crianca">Criança</option>
            </select>
            <input type="text" placeholder="Nome do acompanhante" class="acompanhanteName acompanhante-input" data-tipo="adulto">
            <button class="deleteAcompanhante" title="Remover">🗑</button>
        `;

        boxAcompanhantes.appendChild(novoAcompanhante);

        novoAcompanhante.querySelector('.deleteAcompanhante')
            .addEventListener('click', () => {
                novoAcompanhante.style.opacity = '0';
                novoAcompanhante.style.transform = 'translateY(-8px)';
                novoAcompanhante.style.transition = 'all 0.25s ease';
                setTimeout(() => novoAcompanhante.remove(), 250);
            });
    });
}

// =============================================
// CONTAGEM REGRESSIVA (lê data do Firebase)
// =============================================
function atualizarCountdown() {
    get(ref(db, 'evento')).then((snapshot) => {
        const evento = snapshot.val() || {};
        const dataHora = evento.dataHora;

        if (!dataHora) return;

        const dataObj = new Date(dataHora);
        const elData = document.getElementById('info-data');
        const elHora = document.getElementById('info-hora');
        if (elData) elData.innerText = dataObj.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        if (elHora) elHora.innerText = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const alvo = dataObj.getTime();
        const agora = new Date().getTime();
        const diferenca = alvo - agora;

        if (diferenca <= 0) {
            const el = document.getElementById('countdown');
            if (el) el.innerHTML = 'O evento começou!';
            return;
        }

        const dias     = Math.floor(diferenca / (1000 * 60 * 60 * 24));
        const horas    = Math.floor((diferenca % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos  = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);

        const elDias     = document.getElementById('dias');
        const elHoras    = document.getElementById('horas');
        const elMinutos  = document.getElementById('minutos');
        const elSegundos = document.getElementById('segundos');

        if (elDias)     elDias.textContent     = String(dias).padStart(2, '0');
        if (elHoras)    elHoras.textContent    = String(horas).padStart(2, '0');
        if (elMinutos)  elMinutos.textContent  = String(minutos).padStart(2, '0');
        if (elSegundos) elSegundos.textContent = String(segundos).padStart(2, '0');

    }).catch(() => {});
}

atualizarCountdown();
setInterval(atualizarCountdown, 1000);

// =============================================
// MODAL DE LOGIN
// =============================================
const btnOpenLogin   = document.getElementById('btnOpenLogin');
const loginModal     = document.getElementById('loginModal');
const btnCloseLogin  = document.getElementById('btnCloseLogin');
const btnLoginConfirm = document.getElementById('btnLoginConfirm');

if (btnOpenLogin) {
    btnOpenLogin.addEventListener('click', () => {
        if (loginModal) loginModal.classList.remove('hidden');
    });
}

if (btnCloseLogin) {
    btnCloseLogin.addEventListener('click', () => {
        if (loginModal) loginModal.classList.add('hidden');
    });
}

if (btnLoginConfirm) {
    btnLoginConfirm.addEventListener('click', () => {
        const usuario = document.getElementById('adminEmail')?.value;
        const senha   = document.getElementById('password')?.value;

        if (usuario === 'Admin' && senha === '101224') {
            localStorage.setItem('isAdmin', 'true');
            window.location.href = 'admin.html';
        } else {
            alert('❌ Usuário ou senha incorretos!');
        }
    });
}

// =============================================
// INICIALIZAR
// =============================================
renderProdutos();