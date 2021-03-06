/**
 * 基本
 */
import React from 'react'
import FatTable, { ColumnsType, FetchHandler } from '../index'
import Input from 'antd/es/input'
import Form from 'antd/es/form'
import AdminLayout from '../../admin-layout'
import '../style/css'

interface Params {
  name: string
}

interface Data {
  id: string
  name: string
  birthday: string
}

export default class Base extends React.Component {
  private columns: ColumnsType<Data, Params> = [
    {
      title: '名称',
      dataIndex: 'name',
    },
    {
      title: '生日',
      dataIndex: 'birthday',
    },
    {
      title: '操作',
      width: 200,
      fixed: 'right',
      render: (item, _, table) => {
        return (
          <FatTable.Actions>
            <FatTable.Action
              disabled={!table.canShiftUp(item.id)}
              onClick={() => table.shift(item.id, 'up')}
            >
              上移
            </FatTable.Action>
            <FatTable.Action
              disabled={!table.canShiftDown(item.id)}
              onClick={() => table.shift(item.id, 'down')}
            >
              下移
            </FatTable.Action>
            <FatTable.Action onClick={() => table.remove([item.id])}>
              删除
            </FatTable.Action>
          </FatTable.Actions>
        )
      },
    },
  ]
  public render() {
    return (
      <AdminLayout.Body>
        <FatTable<Data, Params>
          enableSelect
          columns={this.columns}
          onFetch={this.handleFetch}
          // 确认默认值
          onInit={query => ({ name: query.getStr('name', '') })}
          header={(form, defaultValue) => (
            <>
              <Form.Item>
                {form.getFieldDecorator('name', {
                  initialValue: defaultValue.name,
                })(<Input placeholder="名称" />)}
              </Form.Item>
            </>
          )}
          headerExtra={<Form.Item>header extra here</Form.Item>}
          expandedRowRender={r => {
            return r.birthday + 'expanded'
          }}
          // 定义默认展开的行
          defaultExpandedRows={list => {
            // 默认展开偶数
            return list.filter(i => parseInt(i.id) % 2 === 0).map(i => i.id)
          }}
          scroll={{ x: 1000 }}
        />
      </AdminLayout.Body>
    )
  }

  private handleFetch: FetchHandler<Data, Params> = async params => {
    console.log('fetching...', { ...params })
    const { pageSize, current } = params
    const list: Data[] = []
    for (let i = 0; i < pageSize; i++) {
      list.push({
        id: `${current + i}`,
        name: `${current + i}${params.name}`,
        birthday: `1995-12-12 12:12:${i}`,
      })
    }
    return {
      list,
      total: pageSize * 7,
    }
  }
}
