const knex = require('../conexao');
const supabase = require('../supabase');

const listarProdutos = async (req, res) => {
    const { usuario } = req;
    const { categoria } = req.query;

    try {
        const produtos = await knex('produtos')
            .where({ usuario_id: usuario.id })
            .where(query => {
                if (categoria) {
                    return query.where('categoria', 'ilike', `%${categoria}%`);
                }
            });

        return res.status(200).json(produtos);
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

const obterProduto = async (req, res) => {
    const { usuario } = req;
    const { id } = req.params;

    try {
        const produto = await knex('produtos').where({
            id,
            usuario_id: usuario.id
        }).first();

        if (!produto) {
            return res.status(404).json('Produto não encontrado');
        }

        return res.status(200).json(produto);
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

const cadastrarProduto = async (req, res) => {
    const { usuario } = req;
    const { nome, estoque, preco, categoria, descricao, imagem } = req.body;

    if (!nome) {
        return res.status(404).json('O campo nome é obrigatório');
    }

    if (!estoque) {
        return res.status(404).json('O campo estoque é obrigatório');
    }

    if (!preco) {
        return res.status(404).json('O campo preco é obrigatório');
    }

    if (!descricao) {
        return res.status(404).json('O campo descricao é obrigatório');
    }

    try {
        let novaImagem = null;

        if (imagem) {
            const buffer = Buffer.from(imagem, 'base64');

            const { error } = await supabase
                .storage
                .from(process.env.SUPABASE_BUCKET)
                .upload(`leofutemma/${nome}.jpg`, buffer);

            if (error) {
                return res.status(400).json(error.message);
            }

            const { publicURL, error: errorPublicUrl } = supabase
                .storage
                .from(process.env.SUPABASE_BUCKET)
                .getPublicUrl(`leofutemma/${nome}.jpg`);

            if (errorPublicUrl) {
                return res.status(400).json(errorPublicUrl.message);
            }

            novaImagem = publicURL;
        }

        const produto = await knex('produtos').insert({
            usuario_id: usuario.id,
            nome,
            estoque,
            preco,
            categoria,
            descricao,
            imagem: novaImagem
        }).returning('*');

        if (!produto) {
            return res.status(400).json('O produto não foi cadastrado');
        }

        return res.status(200).json(produto);
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

const atualizarProduto = async (req, res) => {
    const { usuario } = req;
    const { id } = req.params;
    const { nome, estoque, preco, categoria, descricao } = req.body;

    if (!nome && !estoque && !preco && !categoria && !descricao) {
        return res.status(404).json('Informe ao menos um campo para atualizaçao do produto');
    }

    try {
        const produtoEncontrado = await knex('produtos').where({
            id,
            usuario_id: usuario.id
        }).first();

        if (!produtoEncontrado) {
            return res.status(404).json('Produto não encontrado');
        }

        const produto = await knex('produtos')
            .where({ id })
            .update({
                nome,
                estoque,
                preco,
                categoria,
                descricao
            });

        if (!produto) {
            return res.status(400).json("O produto não foi atualizado");
        }

        return res.status(200).json('produto foi atualizado com sucesso.');
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

const atualizarImagemProduto = async (req, res) => {
    const { usuario } = req;
    const { id } = req.params;
    const { nome, imagem } = req.body;

    if (!nome || !imagem) {
        return res.status(404).json('É necessário fornecer o nome da imagem a ser alterada e uma nova imagem para atualizar!');
    }

    try {
        const produtoEncontrado = await knex('produtos').where({
            id,
            usuario_id: usuario.id
        }).first();

        if (!produtoEncontrado) {
            return res.status(404).json('Produto não encontrado');
        }

        const buffer = Buffer.from(imagem, 'base64');

        const { data } = await supabase
            .storage
            .from(process.env.SUPABASE_BUCKET)
            .list('leofutemma');

        const imagemEncontrada = data.find((imagem) => imagem.name == `${nome}.jpg`);

        if (!imagemEncontrada) {
            const { error: errorImageUpload } = await supabase
                .storage
                .from(process.env.SUPABASE_BUCKET)
                .upload(`leofutemma/${nome}.jpg`, buffer);

            if (errorImageUpload) {
                return res.status(400).json(errorImageUpload.message);
            }

        } else {
            const { error: errorImageRemoval } = await supabase
                .storage
                .from(process.env.SUPABASE_BUCKET)
                .remove(`leofutemma/${imagemEncontrada.name}`);

            if (errorImageRemoval) {
                return res.status(400).json(errorImageRemoval.message);
            }

            const { error: errorImageUpload } = await supabase
                .storage
                .from(process.env.SUPABASE_BUCKET)
                .upload(`leofutemma/${nome}.jpg`, buffer);

            if (errorImageUpload) {
                return res.status(400).json(errorImageUpload.message);
            }
        }

        const { publicURL, error: errorPublicUrl } = supabase
            .storage
            .from(process.env.SUPABASE_BUCKET)
            .getPublicUrl(`leofutemma/${nome}.jpg`);

        if (errorPublicUrl) {
            return res.status(400).json(errorPublicUrl.message);
        }

        const produto = await knex('produtos')
            .where({ id })
            .update({ imagem: publicURL });

        if (!produto) {
            return res.status(400).json("A imagem do produto não foi atualizada");
        }

        return res.status(200).json('A imagem do produto foi atualizada com sucesso!');
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

const excluirImagemProduto = async (req, res) => {
    const { usuario } = req;
    const { id } = req.params;
    const { nome } = req.body;

    try {
        const produtoEncontrado = await knex('produtos').where({
            id,
            usuario_id: usuario.id
        }).first();

        if (!produtoEncontrado) {
            return res.status(404).json('Produto não encontrado');
        }

        const { error: errorImageRemoval } = await supabase
            .storage
            .from(process.env.SUPABASE_BUCKET)
            .remove(`leofutemma/${nome}.jpg`);

        if (errorImageRemoval) {
            return res.status(400).json(errorImageRemoval.message);
        }

        const imagemExcluida = await knex('produtos')
            .where({ id })
            .update({ imagem: null });

        if (!imagemExcluida) {
            return res.status(400).json("A imagem do produto não foi excluída");
        }

        return res.status(200).json('A imagem do produto foi excluída com sucesso!');
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

const excluirProduto = async (req, res) => {
    const { usuario } = req;
    const { id } = req.params;

    try {
        const produtoEncontrado = await knex('produtos').where({
            id,
            usuario_id: usuario.id
        }).first();

        if (!produtoEncontrado) {
            return res.status(404).json('Produto não encontrado');
        }

        const produtoExcluido = await knex('produtos').where({
            id,
            usuario_id: usuario.id
        }).del();

        if (!produtoExcluido) {
            return res.status(400).json("O produto não foi excluido");
        }

        return res.status(200).json('Produto excluido com sucesso');
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

module.exports = {
    listarProdutos,
    obterProduto,
    cadastrarProduto,
    atualizarProduto,
    atualizarImagemProduto,
    excluirImagemProduto,
    excluirProduto
}