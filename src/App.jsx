import { useEffect, useMemo, useState } from 'react'
import { createRecord, findAllRecords } from './services/api'
import './App.css'

const initialFormState = {
  description: '',
  amount: '',
  type: 'INCOME',
}

function App() {
  const [records, setRecords] = useState([])
  const [formData, setFormData] = useState(initialFormState)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const tableColumns = useMemo(() => {
    if (records.length === 0) {
      return ['description', 'amount', 'type']
    }

    return Object.keys(records[0])
  }, [records])

  const loadRecords = async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await findAllRecords()
      setRecords(Array.isArray(data) ? data : [])
    } catch {
      setError('Não foi possível carregar os registros.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')

    try {
      await createRecord({
        ...formData,
        amount: Number(formData.amount),
      })

      await loadRecords()
      setFormData(initialFormState)
    } catch {
      setError('Não foi possível salvar o registro.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="page">
      <h1>Cash Flow Control</h1>

      <section className="card">
        <h2>Criação de registro</h2>
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Descrição
            <input
              name="description"
              type="text"
              value={formData.description}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Valor
            <input
              name="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Tipo
            <select name="type" value={formData.type} onChange={handleChange}>
              <option value="INCOME">Receita</option>
              <option value="EXPENSE">Despesa</option>
            </select>
          </label>

          <button type="submit" disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Lista de registros (findAll)</h2>

        {isLoading && <p>Carregando registros...</p>}
        {error && <p className="error">{error}</p>}

        {!isLoading && !error && records.length === 0 && (
          <p>Nenhum registro encontrado.</p>
        )}

        {!isLoading && records.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {tableColumns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr key={record.id ?? index}>
                    {tableColumns.map((column) => (
                      <td key={`${record.id ?? index}-${column}`}>
                        {String(record[column] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
