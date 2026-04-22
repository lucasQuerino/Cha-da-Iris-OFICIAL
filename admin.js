import { db } from './firebase.js';
import { ref, set, remove, get, update } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";

// Verificar autenticação (com delay para evitar loop infinito)
window.addEventListener('load', () => {
    if (!localStorage.getItem('isAdmin')) {
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 500);
    }
});

// =============================================
// LISTA DE CONVIDADOS OFICIAIS (gerenciada no Firebase)
// =============================================
// A lista de convidados oficiais agora é persistida em Firebase em /listaOficial
// Ao carregar, lemos de lá. Se não existir ainda, usamos o padrão abaixo.
const LISTA_PADRAO = [
    "Lucas", "Izabelle", "Jane", "Clovis", "Willian", "Adriana", "Wendel", "Claudia", "Gabriel",
    "Deise", "Bryan", "Bento", "Zezita", "Talita", "Jorge", "Luan", "Maria Zilmar", "Braz",
    "Patrícia", "Camila", "Letícia", "Arthur", "Edmilson", "Gabrielle", "Nicollas", "Maria",
    "Patrick", "Jeniffer Cosso", "Hugo", "Nicolle", "Kayky", "João", "Marilza Midori",
    "Rogerio Carmo", "Guilherme Shoji", "Vinicius Takeshi", "Diego Kioshi"
];

let listaOficialAtual = [...LISTA_PADRAO];

// =============================================
// FUNÇÕES DE UI
// =============================================
window.switchSection = (section, el) => {
    document.querySelectorAll('.section-admin').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
    if (el) el.closest('.sidebar-btn').classList.add('active');

    if (section === 'convidados') carregarConvidados();
    else if (section === 'produtos') carregarProdutos();
    else if (section === 'cards') carregarCards();
    else if (section === 'evento') carregarEvento();
    else if (section === 'iris') carregarIris();
    else if (section === 'lista-oficial') carregarListaOficial();
};

window.logout = () => {
    localStorage.removeItem('isAdmin');
    window.location.href = 'home.html';
};

function showAlert(elementId, msg, type) {
    const el = document.getElementById(elementId);
    if (!el) { console.warn('showAlert: elemento não encontrado:', elementId); return; }
    el.className = `alert-msg show alert-${type}`;
    el.innerText = msg;
    setTimeout(() => el.classList.remove('show'), 3000);
}

// =============================================
// CONVIDADOS CONFIRMADOS (lidos do Firebase /convidados)
// =============================================
async function carregarConvidados() {
    try {
        const snapshot = await get(ref(db, 'convidados'));
        const convidados = snapshot.val() || {};
        let total = 0, adultos = 0, criancas = 0;
        const lista = document.getElementById('lista-convidados');
        lista.innerHTML = '';

        Object.entries(convidados).forEach(([key, c]) => {
            total++;
            const acompanhantes = c.acompanhantes || [];
            acompanhantes.forEach(a => {
                if (a.tipo === "adulto") adultos++;
                else if (a.tipo === "crianca") criancas++;
            });

            const div = document.createElement("div");
            div.className = "convidado-item confirmado";

            let acompanhantesHTML = "";
            if (acompanhantes.length > 0) {
                acompanhantesHTML = '<div class="acompanhantes-lista" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">';
                acompanhantes.forEach(a => {
                    acompanhantesHTML += `<div class="acompanhante-item" style="font-size: 0.9rem; color: #666; margin: 4px 0;">👤 ${a.nome || 'Sem nome'} (${a.tipo === 'adulto' ? 'Adulto' : 'Criança'})</div>`;
                });
                acompanhantesHTML += '</div>';
            }

            div.innerHTML = `
                <div class="convidado-nome">✅ ${key} (Titular)</div>
                <div class="convidado-info">Email: ${c.email || '-'}</div>
                <div class="convidado-info">WhatsApp: ${c.whatsapp || '-'}</div>
                <div class="convidado-info">Presente: ${c.presente || 'Nenhum'}</div>
                ${acompanhantesHTML}
            `;
            lista.appendChild(div);
        });

        document.getElementById('total-convidados').innerText = total;
        document.getElementById('total-adultos').innerText = adultos;
        document.getElementById('total-criancas').innerText = criancas;
    } catch (e) {
        console.error('Erro ao carregar convidados:', e);
    }
}

// =============================================
// LISTA OFICIAL DE CONVIDADOS — CRUD
// =============================================
async function carregarListaOficial() {
    try {
        const snapshot = await get(ref(db, 'listaOficial'));
        if (snapshot.val()) {
            listaOficialAtual = snapshot.val();
        } else {
            // Primeira vez: salva a lista padrão no Firebase
            await set(ref(db, 'listaOficial'), LISTA_PADRAO);
            listaOficialAtual = [...LISTA_PADRAO];
        }
        renderListaOficial();
    } catch (e) {
        console.error('Erro ao carregar lista oficial:', e);
    }
}

function renderListaOficial() {
    const container = document.getElementById('lista-oficial-items');
    if (!container) return;
    container.innerHTML = '';

    if (listaOficialAtual.length === 0) {
        container.innerHTML = '<p style="color:var(--texto-claro);font-style:italic;text-align:center;padding:20px 0;">Nenhum convidado na lista.</p>';
        return;
    }

    listaOficialAtual.forEach((nome, idx) => {
        const div = document.createElement('div');
        div.className = 'lista-oficial-item';
        div.id = `loi-${idx}`;
        div.innerHTML = `
            <span class="loi-nome" id="loi-nome-${idx}">${nome}</span>
            <div class="loi-acoes">
                <button class="loi-btn loi-editar" onclick="window.editarConvidadoOficial(${idx})" title="Editar">✏️</button>
                <button class="loi-btn loi-excluir" onclick="window.excluirConvidadoOficial(${idx})" title="Excluir">🗑</button>
            </div>
        `;
        container.appendChild(div);
    });

    // Contador
    const contador = document.getElementById('lista-oficial-total');
    if (contador) contador.textContent = listaOficialAtual.length;
}

window.adicionarConvidadoOficial = async () => {
    const input = document.getElementById('novoConvidadoNome');
    const nome = input?.value?.trim();
    if (!nome) {
        showAlert('alertaListaOficial', '❌ Digite o nome do convidado', 'error');
        return;
    }
    if (listaOficialAtual.includes(nome)) {
        showAlert('alertaListaOficial', '⚠️ Este convidado já está na lista', 'error');
        return;
    }
    listaOficialAtual.push(nome);
    try {
        await set(ref(db, 'listaOficial'), listaOficialAtual);
        showAlert('alertaListaOficial', `✅ "${nome}" adicionado com sucesso!`, 'success');
        if (input) input.value = '';
        renderListaOficial();
    } catch (e) {
        listaOficialAtual.pop();
        showAlert('alertaListaOficial', '❌ Erro: ' + e.message, 'error');
    }
};

// Timer de debounce para auto-save após inatividade
let _debounceTimerLOI = null;

window.editarConvidadoOficial = (idx) => {
    const nomeEl = document.getElementById(`loi-nome-${idx}`);
    if (!nomeEl) return;
    const nomeAtual = listaOficialAtual[idx];

    // Substitui span por input inline — sem oninput nem onchange
    nomeEl.outerHTML = `
        <input type="text" id="loi-input-${idx}" class="loi-input-edit" value="${nomeAtual}">
    `;

    const acoesEl = document.querySelector(`#loi-${idx} .loi-acoes`);
    if (acoesEl) {
        acoesEl.innerHTML = `
            <button class="loi-btn loi-salvar" onclick="window.salvarEdicaoConvidado(${idx})" title="Salvar (Enter)">✅</button>
            <button class="loi-btn loi-cancelar" onclick="window.renderListaOficial()" title="Cancelar">✕</button>
        `;
    }

    // Foca o input e configura:
    // - Enter → salvar imediatamente
    // - Escape → cancelar
    // - Debounce de 1.5s após parar de digitar → salva automaticamente
    const inputEl = document.getElementById(`loi-input-${idx}`);
    if (inputEl) {
        inputEl.focus();
        inputEl.select();

        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(_debounceTimerLOI);
                window.salvarEdicaoConvidado(idx);
            } else if (e.key === 'Escape') {
                clearTimeout(_debounceTimerLOI);
                window.renderListaOficial();
            }
        });

        // Debounce: só salva 1.5s após parar de digitar
        inputEl.addEventListener('input', () => {
            clearTimeout(_debounceTimerLOI);
            _debounceTimerLOI = setTimeout(() => {
                window.salvarEdicaoConvidado(idx);
            }, 1500);
        });
    }
};

window.salvarEdicaoConvidado = async (idx) => {
    // Cancela qualquer debounce pendente para evitar duplo salvamento
    clearTimeout(_debounceTimerLOI);

    const input = document.getElementById(`loi-input-${idx}`);
    const novoNome = input?.value?.trim();
    if (!novoNome) {
        showAlert('alertaListaOficial', '❌ O nome não pode ser vazio', 'error');
        return;
    }
    const nomeAntigo = listaOficialAtual[idx];
    listaOficialAtual[idx] = novoNome;
    try {
        await set(ref(db, 'listaOficial'), listaOficialAtual);
        showAlert('alertaListaOficial', `✅ "${nomeAntigo}" → "${novoNome}" atualizado!`, 'success');
        renderListaOficial();
    } catch (e) {
        listaOficialAtual[idx] = nomeAntigo;
        showAlert('alertaListaOficial', '❌ Erro: ' + e.message, 'error');
        renderListaOficial();
    }
};

window.excluirConvidadoOficial = async (idx) => {
    const nome = listaOficialAtual[idx];
    if (!confirm(`Remover "${nome}" da lista de convidados?`)) return;
    listaOficialAtual.splice(idx, 1);
    try {
        await set(ref(db, 'listaOficial'), listaOficialAtual);
        showAlert('alertaListaOficial', `✅ "${nome}" removido da lista`, 'success');
        renderListaOficial();
    } catch (e) {
        listaOficialAtual.splice(idx, 0, nome);
        showAlert('alertaListaOficial', '❌ Erro: ' + e.message, 'error');
        renderListaOficial();
    }
};

// Expõe renderListaOficial globalmente para cancelar edição inline
window.renderListaOficial = renderListaOficial;

// =============================================
// PRODUTOS
// =============================================
window.adicionarProduto = async () => {
    const nome = document.getElementById('novoProdutoNome').value.trim();
    const estoque = parseInt(document.getElementById('novoProdutoEstoque').value) || 5;
    const icone = document.getElementById('novoProdutoIcone').value.trim() || '🎁';

    if (!nome) {
        showAlert('alertaProduto', '❌ Digite o nome do produto', 'error');
        return;
    }

    try {
        const id = Date.now().toString();
        await set(ref(db, `estoque/${id}`), { nome, estoque, icone });
        showAlert('alertaProduto', '✅ Produto adicionado com sucesso!', 'success');
        document.getElementById('novoProdutoNome').value = '';
        document.getElementById('novoProdutoEstoque').value = '';
        document.getElementById('novoProdutoIcone').value = '';
        await carregarProdutos();
    } catch (e) {
        showAlert('alertaProduto', '❌ Erro: ' + e.message, 'error');
    }
};

window.deletarProduto = async (id) => {
    if (!confirm('Tem certeza?')) return;
    try {
        await remove(ref(db, `estoque/${id}`));
        showAlert('alertaProduto', '✅ Produto removido!', 'success');
        await carregarProdutos();
    } catch (e) {
        showAlert('alertaProduto', '❌ Erro: ' + e.message, 'error');
    }
};

async function carregarProdutos() {
    try {
        const snapshot = await get(ref(db, 'estoque'));
        const produtos = snapshot.val() || {};
        const lista = document.getElementById('lista-produtos');
        lista.innerHTML = '';

        Object.entries(produtos).forEach(([id, p]) => {
            const div = document.createElement('div');
            div.className = 'produto-item';
            div.innerHTML = `
                <div class="produto-info">
                    <h6>${p.icone} ${p.nome}</h6>
                    <small>Estoque: ${p.estoque}</small>
                </div>
                <div>
                    <button class="btn-deletar" onclick="window.deletarProduto('${id}')">Remover</button>
                </div>
            `;
            lista.appendChild(div);
        });
    } catch (e) {
        console.error('Erro ao carregar produtos:', e);
    }
}

// =============================================
// CARDS — CORREÇÃO DO BUG + COR DO TEXTO
// =============================================

// Abas de navegação entre cards
window.abrirTabCard = (num, el) => {
    document.querySelectorAll('.card-tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.card-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-card${num}`).classList.add('active');
    if (el) el.classList.add('active');
};

window.setEmoji = (num, emoji) => {
    const input = document.getElementById(`card${num}Emoji`);
    if (input) { input.value = emoji; window.atualizarPreview(num); }
};

window.atualizarPreview = (num) => {
    const getVal = id => document.getElementById(id)?.value || '';
    const titulo    = getVal(`card${num}Titulo`);
    const subtitulo = getVal(`card${num}Subtitulo`);
    const texto     = getVal(`card${num}Texto`);
    const texto2    = getVal(`card${num}Texto2`);
    const cor       = getVal(`card${num}Cor`) || '#2d5a3d';
    const cor2      = getVal(`card${num}Cor2`) || '#4a7c59';
    const corTexto  = getVal(`card${num}CorTexto`) || '#e8c96a';
    const emoji     = getVal(`card${num}Emoji`) || '💗';
    const ornamento = getVal(`card${num}Ornamento`) || '✦ ✦ ✦';

    const header = document.getElementById(`preview${num}-header`);
    if (header) {
        header.style.background = `linear-gradient(135deg, ${cor} 0%, ${cor2} 100%)`;
        header.style.color = corTexto;
    }

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    setEl(`preview${num}-titulo`,    titulo || `Card ${num}`);
    setEl(`preview${num}-subtitulo`, subtitulo);
    setEl(`preview${num}-ornamento`, ornamento);
    setEl(`preview${num}-ornamento2`,ornamento);
    setEl(`preview${num}-divisor`,   emoji ? `${emoji} ${emoji} ${emoji}` : '');
    setEl(`preview${num}-texto`,     texto);
    setEl(`preview${num}-texto2`,    texto2);
};

// ⚠️ CORREÇÃO PRINCIPAL: a variável local "get" sobrescrevia o import do Firebase.
// Renomeamos para "getVal" para evitar conflito.
window.salvarCard = async (num) => {
    const getVal = id => document.getElementById(id)?.value?.trim() || '';

    const titulo    = getVal(`card${num}Titulo`);
    const subtitulo = getVal(`card${num}Subtitulo`);
    const texto     = getVal(`card${num}Texto`);
    const texto2    = getVal(`card${num}Texto2`);
    const cor       = getVal(`card${num}Cor`) || '#2d5a3d';
    const cor2      = getVal(`card${num}Cor2`) || '#4a7c59';
    const corTexto  = getVal(`card${num}CorTexto`) || '#e8c96a';
    const emoji     = getVal(`card${num}Emoji`);
    const ornamento = getVal(`card${num}Ornamento`) || '✦ ✦ ✦';

    if (!titulo || !texto) {
        showAlert('alertaCards', '❌ Preencha ao menos o título e o texto principal', 'error');
        return;
    }

    try {
        await set(ref(db, `configCards/card${num}`), {
            titulo, subtitulo, texto, texto2, cor, cor2, corTexto, emoji, ornamento
        });
        showAlert('alertaCards', `✅ Card ${num} salvo com sucesso!`, 'success');
    } catch (e) {
        showAlert('alertaCards', '❌ Erro: ' + e.message, 'error');
    }
};

async function carregarCards() {
    try {
        const snapshot = await get(ref(db, 'configCards'));
        const config = snapshot.val() || {};

        for (let i = 1; i <= 3; i++) {
            const card = config[`card${i}`] || {};
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
            setVal(`card${i}Titulo`,    card.titulo    || '');
            setVal(`card${i}Subtitulo`, card.subtitulo || '');
            setVal(`card${i}Texto`,     card.texto     || '');
            setVal(`card${i}Texto2`,    card.texto2    || '');
            setVal(`card${i}Cor`,       card.cor       || '#2d5a3d');
            setVal(`card${i}Cor2`,      card.cor2      || '#4a7c59');
            setVal(`card${i}CorTexto`,  card.corTexto  || '#e8c96a');
            setVal(`card${i}Emoji`,     card.emoji     || '');
            const ornEl = document.getElementById(`card${i}Ornamento`);
            if (ornEl && card.ornamento) ornEl.value = card.ornamento;
            window.atualizarPreview(i);
        }
    } catch (e) {
        console.error('Erro ao carregar cards:', e);
    }
}

// =============================================
// EVENTO
// =============================================
window.salvarEvento = async () => {
    const data  = document.getElementById('eventoData').value;
    const hora  = document.getElementById('eventoHora').value;
    const texto = document.getElementById('eventoTexto').value;

    if (!data || !hora || !texto) {
        showAlert('alertaEvento', '❌ Preencha todos os campos', 'error');
        return;
    }

    try {
        const dataHora = `${data}T${hora}`;
        await set(ref(db, 'evento'), { dataHora, texto, data, hora });
        showAlert('alertaEvento', '✅ Evento salvo com sucesso!', 'success');
    } catch (e) {
        showAlert('alertaEvento', '❌ Erro: ' + e.message, 'error');
    }
};

async function carregarEvento() {
    try {
        const snapshot = await get(ref(db, 'evento'));
        const ev = snapshot.val() || {};
        if (ev.dataHora) {
            const [dataPart, horaPart] = ev.dataHora.split('T');
            document.getElementById('eventoData').value = dataPart || '';
            document.getElementById('eventoHora').value = horaPart || '';
        } else {
            document.getElementById('eventoData').value = ev.data || '';
            document.getElementById('eventoHora').value = ev.hora || '';
        }
        document.getElementById('eventoTexto').value = ev.texto || '';
    } catch (e) {
        console.error('Erro ao carregar evento:', e);
    }
}

// =============================================
// FOTO IRIS
// =============================================
window.salvarIris = async () => {
    const base64 = window._irisBase64Pending || null;
    const url = document.getElementById('irisUrl').value.trim();
    const valor = base64 || url;

    if (!valor) {
        showAlert('alertaIris', '❌ Selecione uma imagem ou cole uma URL', 'error');
        return;
    }

    const btn = document.getElementById('btnSalvarIris');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }

    try {
        await set(ref(db, 'irisImage'), { url: valor });
        window._irisBase64Pending = null;
        showAlert('alertaIris', '✅ Foto salva com sucesso!', 'success');
    } catch (e) {
        showAlert('alertaIris', '❌ Erro: ' + e.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-cloud-upload me-1"></i> Salvar Foto'; }
    }
};

async function carregarIris() {
    try {
        const snapshot = await get(ref(db, 'irisImage'));
        const data = snapshot.val() || {};
        const src = data.url || '';
        if (src && !src.startsWith('data:')) {
            document.getElementById('irisUrl').value = src;
        }
        if (src) {
            const img = document.getElementById('previewIris');
            const placeholder = document.getElementById('irisPlaceholder');
            if (img) img.src = src;
            if (placeholder) placeholder.classList.add('hidden');
        }
    } catch (e) {
        console.error('Erro ao carregar iris:', e);
    }
}

// =============================================
// RESET MESTRE
// =============================================
window.resetDB = async () => {
    if (!confirm('⚠️ ATENÇÃO! Isso vai ZERAR TUDO! Tem certeza?')) return;
    if (!confirm('🚨 ÚLTIMA CONFIRMAÇÃO: Isso vai apagar TODOS os dados! Continuar?')) return;

    try {
        const defaultProducts = [
            { nome: "Pacote de Fraldas P", estoque: 5, icone: "🧷" },
            { nome: "Pacote de Fraldas M", estoque: 5, icone: "🧷" },
            { nome: "Pacote de Fraldas G", estoque: 5, icone: "🧷" },
            { nome: "Lenços Umedecidos", estoque: 5, icone: "🧼" },
            { nome: "Pomada Anti-assadura", estoque: 5, icone: "🧴" },
            { nome: "Kit Banho", estoque: 5, icone: "🛁" },
            { nome: "Body de Algodão", estoque: 5, icone: "👕" },
            { nome: "Kit de Meias e Luvas", estoque: 5, icone: "🧤" },
            { nome: "Manta de Bebê", estoque: 5, icone: "🛌" },
            { nome: "Chocalho Divertido", estoque: 5, icone: "🧸" }
        ];

        const estoqueObj = {};
        defaultProducts.forEach((p, i) => { estoqueObj[i.toString()] = p; });

        await set(ref(db, 'convidados'), {});
        await set(ref(db, 'estoque'), estoqueObj);
        await set(ref(db, 'listaOficial'), LISTA_PADRAO);
        await set(ref(db, 'configCards'), {
            card1: { titulo: "Chá de Fraldas", texto: "Este site foi criado com muito amor para compartilhar com todos vocês cada momento dessa fase deliciosa que é a gestação do nosso bebê 👶🍼🧷", cor: "#2d5a3d", cor2: "#4a7c59", corTexto: "#e8c96a" },
            card2: { titulo: "Lista de Presentes", texto: "Escolha um presente para nos agraciar! (Cada item tem estoque limitado)", cor: "#4a7c59", cor2: "#6aaa7a", corTexto: "#e8c96a" },
            card3: { titulo: "Informações do Evento", texto: "Saiba mais sobre o evento. Data, hora, local e mais.", cor: "#2d5a3d", cor2: "#4a7c59", corTexto: "#e8c96a" }
        });
        await set(ref(db, 'evento'), { dataHora: "2026-07-25T15:00", data: "2026-07-25", hora: "15:00", texto: "Domingo, 25 de Julho de 2026" });
        await set(ref(db, 'irisImage'), { url: "https://via.placeholder.com/300?text=Foto+da+Iris" });

        alert('✅ Sistema resetado com sucesso! A página será recarregada.');
        setTimeout(() => { location.reload(); }, 500);
    } catch (e) {
        alert('❌ Erro ao resetar: ' + e.message);
    }
};

// =============================================
// INICIALIZAR
// =============================================
carregarConvidados();
carregarProdutos();
carregarCards();
carregarEvento();
carregarIris();
carregarListaOficial();