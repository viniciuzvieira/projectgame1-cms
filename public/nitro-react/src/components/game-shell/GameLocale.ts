import { getGamePreferences, useGameProfile } from './GameProfile';

// Portuguese is the source language. Keys are accent-insensitive for legacy catalog text.
const messages: [string, string, string][] = [
    ["VOCÊ ENCONTROU!","YOU FOUND IT!","¡LO ENCONTRASTE!"],
    ["Carta adicionada à sua coleção","Card added to your collection","Carta añadida a tu colección"],
    ["Carta adicionada apenas nesta demonstração","Card added only in this demo","Carta añadida solo en esta demo"],
    ["Arraste uma ponta do topo para o outro lado","Drag either top corner to the opposite side","Arrastra una esquina superior hacia el lado opuesto"],
    ["Segure uma ponta do topo e arraste para o lado oposto para rasgar o pacote","Hold either top corner and drag to the opposite side to tear the pack","Sujeta una esquina superior y arrastra hacia el lado opuesto para rasgar el paquete"],
    ["Revelando card","Revealing card","Revelando carta"],
    ["ABRINDO PACOTE...","OPENING PACK...","ABRIENDO PAQUETE..."],
    ["REVELANDO...","REVEALING...","REVELANDO..."],
    ["PACOTES ESGOTADOS","NO PACKS LEFT","SIN PAQUETES"],
    ["ABRIR OUTRO PACOTE","OPEN ANOTHER PACK","ABRIR OTRO PAQUETE"],
    ["ABRIR SEM ARRASTAR","OPEN WITHOUT DRAGGING","ABRIR SIN ARRASTRAR"],
    ["Guardião da Forja","Forge Guardian","Guardián de la Forja"],
    ["Corredor Faísca","Spark Runner","Corredor Chispa"],
    ["Sentinela Ártico","Arctic Sentinel","Centinela Ártico"],
    ["Patrulheiro Neon","Neon Ranger","Explorador Neón"],
    ["Batedor Glacial","Frost Scout","Explorador Glacial"],
    ["Soberano Pixel","Pixel Sovereign","Soberano Píxel"],
    ["Mecânico Byte","Byte Mechanic","Mecánico Byte"],
    ["Corredor Pocket","Pocket Runner","Corredor Pocket"],
    ["O início da sua coleção. Heróis que escreveram os primeiros capítulos.","The start of your collection. Heroes who wrote the first chapters.","El inicio de tu colección. Héroes que escribieron los primeros capítulos."],
    ["Tecnologia glacial e exploradores das fronteiras digitais.","Glacial technology and explorers of digital frontiers.","Tecnología glacial y exploradores de las fronteras digitales."],
    ["Relíquias portáteis, circuitos neon e guardiões de uma nova geração.","Portable relics, neon circuits and guardians of a new generation.","Reliquias portátiles, circuitos neón y guardianes de una nueva generación."],
    ["SÉRIE 01","SERIES 01","SERIE 01"],
    ["SÉRIE 02","SERIES 02","SERIE 02"],
    ["SÉRIE 03","SERIES 03","SERIE 03"],
    ["Sua sessão precisa ser verificada. Entre novamente no jogo.","Your session needs verification. Sign in again.","Tu sesión necesita verificación. Inicia sesión de nuevo."],
    ["Entre novamente no jogo para acessar sua coleção.","Sign in again to access your collection.","Inicia sesión de nuevo para acceder a tu colección."],
    ["Sua sessão expirou. Atualize a coleção e tente novamente.","Your session expired. Refresh your collection and try again.","Tu sesión caducó. Actualiza la colección e inténtalo de nuevo."],
    ["Este item não está mais disponível. Atualize a coleção.","This item is no longer available. Refresh the collection.","Este objeto ya no está disponible. Actualiza la colección."],
    ["Aguarde alguns instantes antes de tentar novamente.","Wait a moment before trying again.","Espera un momento antes de intentarlo de nuevo."],
    ["O servidor não confirmou a abertura. Tente novamente para verificar sem gastar outro pacote.","The server did not confirm the opening. Retry to check without spending another pack.","El servidor no confirmó la apertura. Reintenta sin gastar otro paquete."],
    ["O servidor não confirmou a operação. Atualize a coleção para verificar.","The server did not confirm the action. Refresh your collection to check.","El servidor no confirmó la operación. Actualiza la colección para comprobarlo."],
    ["Não foi possível acessar a coleção.","Could not access your collection.","No se pudo acceder a la colección."],
    ["A conexão foi interrompida. Tente novamente para confirmar a mesma abertura.","Connection interrupted. Retry to confirm the same opening.","Conexión interrumpida. Reintenta para confirmar la misma apertura."],
    ["A conexão foi interrompida. Atualize a coleção para verificar se a alteração foi salva.","Connection interrupted. Refresh the collection to check whether the change was saved.","Conexión interrumpida. Actualiza la colección para comprobar si se guardó el cambio."],
    ["no deck","in deck","en el mazo"],
    ["já adicionado","already added","ya añadido"],
    ["Principal","Primary","Principal"],
    ["Seus decks","Your decks","Tus mazos"],
    ["{count} cópias no deck","{count} copies in deck","{count} copias en el mazo"],
    ["Editar deck {name}","Edit deck {name}","Editar mazo {name}"],
    ["Cartas no deck {name}","Cards in deck {name}","Cartas en el mazo {name}"],
    ["Remover uma cópia de {name} do deck","Remove a copy of {name} from the deck","Quitar una copia de {name} del mazo"],
    ["Adicionar uma cópia de {name} ao deck","Add a copy of {name} to the deck","Añadir una copia de {name} al mazo"],
    ["Opções de {name} no deck","Options for {name} in deck","Opciones de {name} en el mazo"],
    ["{count} unidades","{count} copies","{count} unidades"],
    ["{name}, {count} pacotes","{name}, {count} packs","{name}, {count} paquetes"],
    ["Adicionar {name} ao deck {deck}, {count} disponíveis","Add {name} to deck {deck}, {count} available","Añadir {name} al mazo {deck}, {count} disponibles"],
    ["Voltar aos decks","Back to decks","Volver a los mazos"],
    ["Menu do jogo","Game menu","Menú del juego"],
    [
        "Minha coleção",
        "My collection",
        "Mi colección"
    ],
    [
        "Pacotes",
        "Packs",
        "Paquetes"
    ],
    [
        "Cartas",
        "Cards",
        "Cartas"
    ],
    [
        "Decks",
        "Decks",
        "Mazos"
    ],
    [
        "Configurações",
        "Settings",
        "Configuración"
    ],
    [
        "Aparência",
        "Appearance",
        "Apariencia"
    ],
    [
        "Som",
        "Audio",
        "Sonido"
    ],
    [
        "Teclas",
        "Key bindings",
        "Teclas"
    ],
    [
        "Jogo",
        "Gameplay",
        "Juego"
    ],
    [
        "Claro",
        "Light",
        "Claro"
    ],
    [
        "Escuro",
        "Dark",
        "Oscuro"
    ],
    [
        "Roxo",
        "Purple",
        "Morado"
    ],
    [
        "Idioma",
        "Language",
        "Idioma"
    ],
    [
        "Tema da interface",
        "Interface theme",
        "Tema de la interfaz"
    ],
    [
        "Personalize sua estação",
        "Customize your station",
        "Personaliza tu estación"
    ],
    [
        "As alterações ficam salvas na sua conta.",
        "Changes are saved to your account.",
        "Los cambios se guardan en tu cuenta."
    ],
    [
        "Salvando...",
        "Saving...",
        "Guardando..."
    ],
    [
        "Não foi possível salvar. Tente novamente.",
        "Could not save. Try again.",
        "No se pudo guardar. Inténtalo de nuevo."
    ],
    [
        "Terminal",
        "Terminal",
        "Terminal"
    ],
    [
        "Alterar tecla",
        "Change key",
        "Cambiar tecla"
    ],
    [
        "Pressione uma tecla. Esc cancela.",
        "Press a key. Esc cancels.",
        "Pulsa una tecla. Esc cancela."
    ],
    [
        "WASD é reservado para movimentação.",
        "WASD is reserved for movement.",
        "WASD está reservado para moverse."
    ],
    [
        "Use uma letra, número ou pontuação, sem modificadores.",
        "Use a letter, number or punctuation without modifiers.",
        "Usa una letra, número o signo sin modificadores."
    ],
    [
        "Movimentação",
        "Movement",
        "Movimiento"
    ],
    [
        "Restaurar C",
        "Restore C",
        "Restaurar C"
    ],
    [
        "Efeitos da interface",
        "Interface effects",
        "Efectos de interfaz"
    ],
    [
        "Objetos do quarto",
        "Room objects",
        "Objetos de la sala"
    ],
    [
        "Música",
        "Music",
        "Música"
    ],
    [
        "Chat clássico",
        "Classic chat",
        "Chat clásico"
    ],
    [
        "Ignorar convites de quartos",
        "Ignore room invitations",
        "Ignorar invitaciones a salas"
    ],
    [
        "Desativar câmera seguindo avatar",
        "Disable camera following avatar",
        "Desactivar seguimiento de cámara"
    ],
    [
        "Colocar vários objetos",
        "Place multiple objects",
        "Colocar varios objetos"
    ],
    [
        "Pular confirmação de compra",
        "Skip purchase confirmation",
        "Omitir confirmación de compra"
    ],
    [
        "Carregando...",
        "Loading...",
        "Cargando..."
    ],
    [
        "Tentar novamente",
        "Try again",
        "Reintentar"
    ],
    [
        "Dados",
        "Data",
        "Datos"
    ],
    [
        "Gás",
        "Gas",
        "Gas"
    ],
    [
        "Petróleo",
        "Oil",
        "Petróleo"
    ],
    [
        "Ferro",
        "Iron",
        "Hierro"
    ],
    [
        "Ouro",
        "Gold",
        "Oro"
    ],
    [
        "Recursos do jogador",
        "Player resources",
        "Recursos del jugador"
    ],
    [
        "Recursos indisponíveis",
        "Resources unavailable",
        "Recursos no disponibles"
    ],
    [
        "Evolução de skills",
        "Skill progression",
        "Evolución de habilidades"
    ],
    [
        "Árvore Android",
        "Android tree",
        "Árbol Android"
    ],
    [
        "Selecione um módulo",
        "Select a module",
        "Selecciona un módulo"
    ],
    [
        "Módulos conectados",
        "Connected modules",
        "Módulos conectados"
    ],
    [
        "Evolução registrada",
        "Recorded progression",
        "Progreso registrado"
    ],
    [
        "Bloqueado",
        "Locked",
        "Bloqueado"
    ],
    [
        "Disponível",
        "Available",
        "Disponible"
    ],
    [
        "Ativo",
        "Active",
        "Activo"
    ],
    [
        "Prévia da árvore Android. A obtenção de pontos será integrada às atividades do jogo.",
        "Android tree preview. Earning points will be linked to game activities.",
        "Vista previa del árbol Android. Los puntos se integrarán en las actividades del juego."
    ],
    [
        "Núcleo sintético",
        "Synthetic core",
        "Núcleo sintético"
    ],
    [
        "Rede neural",
        "Neural network",
        "Red neuronal"
    ],
    [
        "Blindagem",
        "Armor",
        "Blindaje"
    ],
    [
        "Servomotores",
        "Servomotors",
        "Servomotores"
    ],
    [
        "Pulso de dados",
        "Data pulse",
        "Pulso de datos"
    ],
    [
        "Firewall",
        "Firewall",
        "Cortafuegos"
    ],
    [
        "Reparo autônomo",
        "Self repair",
        "Reparación autónoma"
    ],
    [
        "Escudo magnético",
        "Magnetic shield",
        "Escudo magnético"
    ],
    [
        "Reflexos",
        "Reflexes",
        "Reflejos"
    ],
    [
        "Sobrecarga",
        "Overdrive",
        "Sobrecarga"
    ],
    [
        "Consciência expandida",
        "Expanded awareness",
        "Conciencia expandida"
    ],
    [
        "Bastião",
        "Bastion",
        "Bastión"
    ],
    [
        "Propulsão",
        "Propulsion",
        "Propulsión"
    ],
    [
        "Buscar pacote pelo nome",
        "Search packs by name",
        "Buscar paquete por nombre"
    ],
    [
        "Buscar carta pelo nome",
        "Search cards by name",
        "Buscar carta por nombre"
    ],
    [
        "Buscar deck pelo nome",
        "Search decks by name",
        "Buscar mazo por nombre"
    ],
    [
        "Pesquisar",
        "Search",
        "Buscar"
    ],
    [
        "Atualizar",
        "Refresh",
        "Actualizar"
    ],
    [
        "Atualizar coleção",
        "Refresh collection",
        "Actualizar colección"
    ],
    [
        "Tipo de coleção",
        "Collection type",
        "Tipo de colección"
    ],
    [
        "SEUS PACOTES",
        "YOUR PACKS",
        "TUS PAQUETES"
    ],
    [
        "SUAS CARTAS",
        "YOUR CARDS",
        "TUS CARTAS"
    ],
    [
        "SUA COLEÇÃO",
        "YOUR COLLECTION",
        "TU COLECCIÓN"
    ],
    [
        "SEUS DECKS",
        "YOUR DECKS",
        "TUS MAZOS"
    ],
    [
        "Carregando sua coleção...",
        "Loading your collection...",
        "Cargando tu colección..."
    ],
    [
        "Nenhum resultado",
        "No results",
        "Sin resultados"
    ],
    [
        "Sua primeira carta espera por você.",
        "Your first card awaits.",
        "Tu primera carta te espera."
    ],
    [
        "Nenhum pacote na coleção.",
        "No packs in your collection.",
        "No hay paquetes en tu colección."
    ],
    [
        "Tente outro nome na busca.",
        "Try another name.",
        "Prueba con otro nombre."
    ],
    [
        "As descobertas dos pacotes ficam guardadas aqui.",
        "Your pack discoveries are kept here.",
        "Tus descubrimientos se guardan aquí."
    ],
    [
        "Escolher um pacote",
        "Choose a pack",
        "Elegir un paquete"
    ],
    [
        "1 carta por pacote",
        "1 card per pack",
        "1 carta por paquete"
    ],
    [
        "ESGOTADO",
        "SOLD OUT",
        "AGOTADO"
    ],
    [
        "Aguarde a revelação para escolher outro pacote.",
        "Wait for the reveal before choosing another pack.",
        "Espera la revelación para elegir otro paquete."
    ],
    [
        "Botão direito na carta para adicionar a um deck.",
        "Right-click a card to add it to a deck.",
        "Haz clic derecho en una carta para añadirla a un mazo."
    ],
    [
        "Selecione uma miniatura para ver de perto.",
        "Select a thumbnail for a closer look.",
        "Selecciona una miniatura para verla de cerca."
    ],
    [
        "Abrir pacote selecionado",
        "Open selected pack",
        "Abrir paquete seleccionado"
    ],
    [
        "Carta selecionada",
        "Selected card",
        "Carta seleccionada"
    ],
    [
        "DESCOBERTA REGISTRADA",
        "DISCOVERY RECORDED",
        "DESCUBRIMIENTO REGISTRADO"
    ],
    [
        "PODER",
        "POWER",
        "PODER"
    ],
    [
        "Adicionar ao deck",
        "Add to deck",
        "Añadir al mazo"
    ],
    [
        "Adicionar ao deck...",
        "Add to deck...",
        "Añadir al mazo..."
    ],
    [
        "Criar meu primeiro deck",
        "Create my first deck",
        "Crear mi primer mazo"
    ],
    [
        "Organizar meus decks",
        "Organize my decks",
        "Organizar mis mazos"
    ],
    [
        "O próximo capítulo é seu.",
        "The next chapter is yours.",
        "El próximo capítulo es tuyo."
    ],
    [
        "Escolha um pacote para começar.",
        "Choose a pack to begin.",
        "Elige un paquete para empezar."
    ],
    [
        "Abra um pacote para revelar sua primeira carta.",
        "Open a pack to reveal your first card.",
        "Abre un paquete para revelar tu primera carta."
    ],
    [
        "Voltar aos decks",
        "Back to decks",
        "Volver a los mazos"
    ],
    [
        "DECK PRINCIPAL",
        "PRIMARY DECK",
        "MAZO PRINCIPAL"
    ],
    [
        "MONTAGEM DE DECK",
        "DECK BUILDER",
        "CONSTRUCTOR DE MAZOS"
    ],
    [
        "Nome do deck",
        "Deck name",
        "Nombre del mazo"
    ],
    [
        "Salvar nome",
        "Save name",
        "Guardar nombre"
    ],
    [
        "Seu deck principal",
        "Your primary deck",
        "Tu mazo principal"
    ],
    [
        "Usar como principal",
        "Set as primary",
        "Usar como principal"
    ],
    [
        "Excluir deck",
        "Delete deck",
        "Eliminar mazo"
    ],
    [
        "Excluir este deck? Todas as cartas continuam na sua coleção.",
        "Delete this deck? All cards stay in your collection.",
        "¿Eliminar este mazo? Las cartas siguen en tu colección."
    ],
    [
        "Confirmar exclusão",
        "Confirm deletion",
        "Confirmar eliminación"
    ],
    [
        "Cancelar",
        "Cancel",
        "Cancelar"
    ],
    [
        "Cartas da coleção para adicionar",
        "Collection cards to add",
        "Cartas de la colección para añadir"
    ],
    [
        "+ Adicionar",
        "+ Add",
        "+ Añadir"
    ],
    [
        "Todas no deck",
        "All in deck",
        "Todas en el mazo"
    ],
    [
        "Nenhuma carta com esse nome.",
        "No card matches that name.",
        "Ninguna carta con ese nombre."
    ],
    [
        "Sua coleção ainda está vazia.",
        "Your collection is still empty.",
        "Tu colección todavía está vacía."
    ],
    [
        "Abra pacotes para descobrir cartas e montar seu deck.",
        "Open packs to discover cards and build your deck.",
        "Abre paquetes para descubrir cartas y construir tu mazo."
    ],
    [
        "Clique na carta para adicionar uma cópia ao deck.",
        "Click a card to add a copy to the deck.",
        "Haz clic en una carta para añadir una copia al mazo."
    ],
    [
        "NO SEU DECK",
        "IN YOUR DECK",
        "EN TU MAZO"
    ],
    [
        "Seu deck começa com uma carta.",
        "Your deck starts with one card.",
        "Tu mazo empieza con una carta."
    ],
    [
        "Escolha na coleção. As cartas adicionadas aparecem aqui.",
        "Choose from your collection. Added cards appear here.",
        "Elige en tu colección. Las cartas añadidas aparecen aquí."
    ],
    [
        "Remover daqui altera apenas o deck. Suas cartas continuam na coleção.",
        "Removing here only changes the deck. Your cards stay in your collection.",
        "Eliminar aquí solo modifica el mazo. Tus cartas siguen en la colección."
    ],
    [
        "Novo deck",
        "New deck",
        "Nuevo mazo"
    ],
    [
        "Nome do seu deck...",
        "Your deck name...",
        "Nombre de tu mazo..."
    ],
    [
        "+ Criar deck",
        "+ Create deck",
        "+ Crear mazo"
    ],
    [
        "Montar deck",
        "Build deck",
        "Construir mazo"
    ],
    [
        "Nenhum deck com esse nome.",
        "No deck matches that name.",
        "Ningún mazo con ese nombre."
    ],
    [
        "Crie seu primeiro deck acima.",
        "Create your first deck above.",
        "Crea tu primer mazo arriba."
    ],
    [
        "Remover do deck",
        "Remove from deck",
        "Quitar del mazo"
    ],
    [
        "Carta removida apenas deste deck.",
        "Card removed only from this deck.",
        "Carta quitada solo de este mazo."
    ],
    [
        "Deck atualizado. Sua coleção permanece intacta.",
        "Deck updated. Your collection is unchanged.",
        "Mazo actualizado. Tu colección sigue intacta."
    ],
    [
        "Deck excluído. Nenhuma carta foi perdida.",
        "Deck deleted. No cards were lost.",
        "Mazo eliminado. No se perdió ninguna carta."
    ],
    [
        "Nome do deck atualizado.",
        "Deck name updated.",
        "Nombre del mazo actualizado."
    ],
    [
        "Deck principal definido.",
        "Primary deck set.",
        "Mazo principal establecido."
    ],
    [
        "Deck pronto. Adicione as cartas que quiser usar.",
        "Deck ready. Add the cards you want to use.",
        "Mazo listo. Añade las cartas que quieras usar."
    ],
    [
        "Não foi possível carregar sua coleção.",
        "Could not load your collection.",
        "No se pudo cargar tu colección."
    ],
    [
        "Não foi possível salvar o deck.",
        "Could not save the deck.",
        "No se pudo guardar el mazo."
    ],
    [
        "Meu personagem",
        "My character",
        "Mi personaje"
    ],
    [
        "Voltar ao hotel",
        "Back to hotel",
        "Volver al hotel"
    ],
    [
        "Meu quarto",
        "My room",
        "Mi sala"
    ],
    [
        "Navegador de quartos",
        "Room browser",
        "Navegador de salas"
    ],
    [
        "Catálogo",
        "Catalog",
        "Catálogo"
    ],
    [
        "Inventário",
        "Inventory",
        "Inventario"
    ],
    [
        "Câmera",
        "Camera",
        "Cámara"
    ],
    [
        "Moderação",
        "Moderation",
        "Moderación"
    ],
    [
        "Amigos",
        "Friends",
        "Amigos"
    ],
    [
        "Mensagens",
        "Messages",
        "Mensajes"
    ],
    [
        "Minha coleção de pacotes e cartas",
        "My pack and card collection",
        "Mi colección de paquetes y cartas"
    ],
    [
        "Edição Fundadores",
        "Founders Edition",
        "Edición Fundadores"
    ],
    [
        "Circuito Ártico",
        "Arctic Circuit",
        "Circuito Ártico"
    ],
    [
        "Arcade Sintético",
        "Synthetic Arcade",
        "Arcade Sintético"
    ],
    [
        "LENDÁRIO",
        "LEGENDARY",
        "LEGENDARIO"
    ],
    [
        "RARO",
        "RARE",
        "RARO"
    ],
    [
        "COMUM",
        "COMMON",
        "COMÚN"
    ],
    [
        "{count} modelos",
        "{count} designs",
        "{count} diseños"
    ],
    [
        "{count} descobertas",
        "{count} discoveries",
        "{count} descubrimientos"
    ],
    [
        "{count} disponíveis",
        "{count} available",
        "{count} disponibles"
    ],
    [
        "{count} na sua coleção",
        "{count} in your collection",
        "{count} en tu colección"
    ],
    [
        "{count} cartas",
        "{count} cards",
        "{count} cartas"
    ],
    [
        "1 carta",
        "1 card",
        "1 carta"
    ],
    [
        "Carta adicionada ao deck {name}.",
        "Card added to deck {name}.",
        "Carta añadida al mazo {name}."
    ],
    [
        "Shop",
        "Shop",
        "Tienda"
    ],
    [
        "Nova aba",
        "New tab",
        "Nueva pestaña"
    ],
    [
        "Buscar na loja",
        "Search the shop",
        "Buscar en la tienda"
    ],
    [
        "Pesquisar nesta aba",
        "Search this tab",
        "Buscar en esta pestaña"
    ],
    [
        "Fechar",
        "Close",
        "Cerrar"
    ],
    [
        "Abrir",
        "Open",
        "Abrir"
    ],
    [
        "Vender",
        "Sell",
        "Vender"
    ],
    [
        "Sobre",
        "About",
        "Acerca de"
    ],
    [
        "Adicionar deck",
        "Add to deck",
        "Añadir al mazo"
    ],
    [
        "Criar deck",
        "Create deck",
        "Crear mazo"
    ],
    [
        "Criar deck com a carta {name}",
        "Create a deck with {name}",
        "Crear un mazo con {name}"
    ]
];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const dictionary = new Map(messages.map(message => [normalize(message[0]), message]));
export const t = (message: string, values: Record<string, string | number> = {}): string =>
{
    const entry = dictionary.get(normalize(message));
    const text = entry ? entry[{ pt: 0, en: 1, es: 2 }[getGamePreferences().locale]] : message;
    return text.replace(/\{(\w+)\}/g, (match, key) => values[key] === undefined ? match : String(values[key]));
};
export const useGameLocale = () => { const { preferences } = useGameProfile(); return { t, locale: preferences.locale }; };
