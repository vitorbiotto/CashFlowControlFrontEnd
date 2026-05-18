import { useCallback, useEffect, useMemo, useState } from 'react'
import api from './services/api'
import './App.css'

const emptyForm = {
  id: null,
  date: '',
  amount: '',
  type: 'EXPENSE',
  category: '',
  categoryId: null,
  description: '',
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
})

const endpointCandidates = ['/api/v1/transactions', '/transactions']

function normalizeType(value) {
  const normalized = `${value ?? ''}`.trim().toUpperCase()

  if (['RECEITA', 'INCOME', 'REVENUE', 'ENTRADA'].includes(normalized)) {
    return 'INCOME'
  }

  return 'EXPENSE'
}

function sortByNewest(first, second) {
  return new Date(second.date) - new Date(first.date)
}

function normalizeCategory(category) {
  if (category && typeof category === 'object') {
    return {
      id: category.id ?? null,
      name: category.name ?? category.nome ?? category.description ?? category.descricao ?? 'Sem categoria',
    }
  }

  return {
    id: null,
    name: category || 'Sem categoria',
  }
}

function normalizeTransaction(transaction) {
  const category = normalizeCategory(transaction.category ?? transaction.categoria)

  return {
    id: transaction.id,
    date: transaction.date || transaction.data || '',
    amount: Number(transaction.amount ?? transaction.valor ?? 0),
    type: normalizeType(transaction.type ?? transaction.tipo),
    category: category.name,
    categoryId: category.id,
    description: transaction.description ?? transaction.descricao ?? '',
  }
}

function toPayload(form) {
  const categoryName = form.category.trim()
  const category = form.categoryId
    ? { id: form.categoryId, name: categoryName }
    : { name: categoryName }

  return {
    date: form.date,
    amount: Number(form.amount),
    type: form.type,
    category,
    description: form.description,
  }
}

function App() {
  const [transactions, setTransactions] = useState([])
  const [activeView, setActiveView] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [selectedTransactionId, setSelectedTransactionId] = useState(null)

  const selectedTransaction = useMemo(
    () => transactions.find((transaction) => transaction.id === selectedTransactionId) ?? null,
    [selectedTransactionId, transactions],
  )

  const expenses = useMemo(
    () => transactions.filter((transaction) => transaction.type === 'EXPENSE').sort(sortByNewest),
    [transactions],
  )

  const incomes = useMemo(
    () => transactions.filter((transaction) => transaction.type === 'INCOME').sort(sortByNewest),
    [transactions],
  )

  const summary = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, transaction) => sum + transaction.amount, 0)
    const totalIncomes = incomes.reduce((sum, transaction) => sum + transaction.amount, 0)

    return {
      totalExpenses,
      totalIncomes,
      balance: totalIncomes - totalExpenses,
    }
  }, [expenses, incomes])


  const requestWithFallback = useCallback(async (method, payload) => {
    let lastError = null

    for (const endpoint of endpointCandidates) {
      try {
        return await method(endpoint, payload)
      } catch (requestError) {
        lastError = requestError

        if (requestError.response && requestError.response.status !== 404) {
          throw requestError
        }
      }
    }

    throw lastError
  }, [])

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await requestWithFallback((endpoint) => api.get(endpoint))
      const items = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.content)
          ? response.data.content
          : []

      setTransactions(items.map(normalizeTransaction).sort(sortByNewest))
    } catch (requestError) {
      setError('Não foi possível carregar as transações. Confira se o backend está disponível e se o endpoint segue o padrão esperado.')
      console.error(requestError)
    } finally {
      setLoading(false)
    }
  }, [requestWithFallback])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  function openCreateForm() {
    setFormData(emptyForm)
    setIsFormOpen(true)
  }

  function openEditForm() {
    if (!selectedTransaction) {
      return
    }

    setFormData({
      id: selectedTransaction.id,
      date: selectedTransaction.date,
      amount: `${selectedTransaction.amount}`,
      type: selectedTransaction.type,
      category: selectedTransaction.category,
      categoryId: selectedTransaction.categoryId,
      description: selectedTransaction.description,
    })
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setFormData(emptyForm)
  }

  function handleInputChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = toPayload(formData)

      if (formData.id) {
        await requestWithFallback((endpoint) => api.put(`${endpoint}/${formData.id}`, payload))
      } else {
        await requestWithFallback((endpoint) => api.post(endpoint, payload))
      }

      closeForm()
      await loadTransactions()
    } catch (requestError) {
      setError('Não foi possível salvar a transação. Verifique os dados preenchidos e a integração com o backend.')
      console.error(requestError)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedTransaction) {
      return
    }

    const isConfirmed = window.confirm('Deseja realmente excluir a transação selecionada?')

    if (!isConfirmed) {
      return
    }

    setError('')

    try {
      await requestWithFallback((endpoint) => api.delete(`${endpoint}/${selectedTransaction.id}`))
      setSelectedTransactionId(null)
      await loadTransactions()
    } catch (requestError) {
      setError('Não foi possível excluir a transação. Tente novamente após validar o backend.')
      console.error(requestError)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="sidebar__eyebrow">Cash Flow Control</p>
          <h1>Gestão financeira simplificada</h1>
          <p className="sidebar__description">
            Acompanhe o saldo disponível, monitore despesas e receitas e gerencie todas as transações em um único lugar.
          </p>
        </div>

        <nav className="sidebar__nav" aria-label="Navegação principal">
          <button
            className={activeView === 'dashboard' ? 'nav-button nav-button--active' : 'nav-button'}
            onClick={() => setActiveView('dashboard')}
            type="button"
          >
            Tela principal
          </button>
          <button
            className={activeView === 'transactions' ? 'nav-button nav-button--active' : 'nav-button'}
            onClick={() => setActiveView('transactions')}
            type="button"
          >
            Transações
          </button>
        </nav>
      </aside>

      <main className="content">
        <header className="content__header">
          <div>
            <p className="content__eyebrow">
              {activeView === 'dashboard' ? 'Resumo geral' : 'Controle de movimentações'}
            </p>
            <h2>
              {activeView === 'dashboard'
                ? 'Visão consolidada da conta'
                : 'Receitas e despesas cadastradas'}
            </h2>
          </div>

          {activeView === 'transactions' ? (
            <div className="header-actions">
              <button className="secondary-button" onClick={openEditForm} type="button" disabled={!selectedTransaction}>
                Editar selecionada
              </button>
              <button className="danger-button" onClick={handleDelete} type="button" disabled={!selectedTransaction}>
                Excluir selecionada
              </button>
              <button className="primary-button" onClick={openCreateForm} type="button">
                Nova transação
              </button>
            </div>
          ) : (
            <button className="primary-button" onClick={() => setActiveView('transactions')} type="button">
              Ir para transações
            </button>
          )}
        </header>

        {error ? <div className="alert">{error}</div> : null}

        {activeView === 'dashboard' ? (
          <section className="dashboard-grid">
            <article className="summary-card summary-card--expense">
              <span>Total de despesas</span>
              <strong>{currencyFormatter.format(summary.totalExpenses)}</strong>
              <small>{expenses.length} lançamento(s) de saída</small>
            </article>

            <article className="summary-card summary-card--income">
              <span>Total de receitas</span>
              <strong>{currencyFormatter.format(summary.totalIncomes)}</strong>
              <small>{incomes.length} lançamento(s) de entrada</small>
            </article>

            <article className="summary-card summary-card--balance">
              <span>Saldo disponível</span>
              <strong>{currencyFormatter.format(summary.balance)}</strong>
              <small>
                {summary.balance >= 0
                  ? 'Seu fluxo de caixa está positivo.'
                  : 'Atenção: o saldo atual está negativo.'}
              </small>
            </article>

            <article className="panel panel--wide">
              <div className="panel__header">
                <div>
                  <p className="panel__eyebrow">Últimas movimentações</p>
                  <h3>Transações mais recentes</h3>
                </div>
              </div>

              {loading ? (
                <p className="empty-state">Carregando transações...</p>
              ) : transactions.length === 0 ? (
                <p className="empty-state">Nenhuma transação cadastrada até o momento.</p>
              ) : (
                <div className="recent-list">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div className="recent-list__item" key={transaction.id}>
                      <div>
                        <strong>{transaction.category}</strong>
                        <p>{transaction.description || 'Sem descrição informada'}</p>
                      </div>
                      <div className="recent-list__meta">
                        <span>{dateFormatter.format(new Date(`${transaction.date}T00:00:00`))}</span>
                        <strong className={transaction.type === 'INCOME' ? 'text-income' : 'text-expense'}>
                          {transaction.type === 'INCOME' ? '+' : '-'} {currencyFormatter.format(transaction.amount)}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        ) : (
          <section className="transactions-layout">
            <article className="panel">
              <div className="panel__header">
                <div>
                  <p className="panel__eyebrow">Despesas</p>
                  <h3>Saídas recentes</h3>
                </div>
                <span className="badge badge--expense">{expenses.length} item(ns)</span>
              </div>

              <TransactionList
                emptyMessage="Nenhuma despesa cadastrada."
                loading={loading}
                onSelect={setSelectedTransactionId}
                selectedTransactionId={selectedTransactionId}
                transactions={expenses}
              />
            </article>

            <article className="panel">
              <div className="panel__header">
                <div>
                  <p className="panel__eyebrow">Receitas</p>
                  <h3>Entradas recentes</h3>
                </div>
                <span className="badge badge--income">{incomes.length} item(ns)</span>
              </div>

              <TransactionList
                emptyMessage="Nenhuma receita cadastrada."
                loading={loading}
                onSelect={setSelectedTransactionId}
                selectedTransactionId={selectedTransactionId}
                transactions={incomes}
              />
            </article>
          </section>
        )}
      </main>

      {isFormOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="transaction-form-title">
            <div className="modal__header">
              <div>
                <p className="panel__eyebrow">Transações</p>
                <h3 id="transaction-form-title">
                  {formData.id ? 'Editar transação' : 'Cadastrar nova transação'}
                </h3>
              </div>
              <button className="icon-button" onClick={closeForm} type="button" aria-label="Fechar formulário">
                ×
              </button>
            </div>

            <form className="transaction-form" onSubmit={handleSubmit}>
              <label>
                Data
                <input name="date" type="date" value={formData.date} onChange={handleInputChange} required />
              </label>

              <label>
                Valor
                <input
                  min="0"
                  name="amount"
                  placeholder="0,00"
                  step="0.01"
                  type="number"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                />
              </label>

              <label>
                Tipo da transação
                <select name="type" value={formData.type} onChange={handleInputChange}>
                  <option value="EXPENSE">Despesa</option>
                  <option value="INCOME">Receita</option>
                </select>
              </label>

              <label>
                Categoria
                <input
                  name="category"
                  placeholder="Ex.: Alimentação"
                  type="text"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                />
              </label>

              <label className="transaction-form__full">
                Descrição
                <textarea
                  name="description"
                  placeholder="Descreva brevemente a transação"
                  rows="4"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </label>

              <div className="modal__actions transaction-form__full">
                <button className="secondary-button" onClick={closeForm} type="button">
                  Cancelar
                </button>
                <button className="primary-button" type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : formData.id ? 'Salvar alterações' : 'Cadastrar transação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function TransactionList({ transactions, loading, emptyMessage, selectedTransactionId, onSelect }) {
  if (loading) {
    return <p className="empty-state">Carregando transações...</p>
  }

  if (transactions.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>
  }

  return (
    <div className="transaction-table-wrapper">
      <table className="transaction-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Categoria</th>
            <th>Descrição</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const isSelected = transaction.id === selectedTransactionId

            return (
              <tr
                key={transaction.id}
                className={isSelected ? 'transaction-table__row transaction-table__row--selected' : 'transaction-table__row'}
                onClick={() => onSelect(transaction.id)}
              >
                <td>{dateFormatter.format(new Date(`${transaction.date}T00:00:00`))}</td>
                <td>{transaction.category}</td>
                <td>{transaction.description || 'Sem descrição'}</td>
                <td className={transaction.type === 'INCOME' ? 'text-income' : 'text-expense'}>
                  {currencyFormatter.format(transaction.amount)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default App
