/**
 * 部门树
 */
import React from 'react'
import Spin from 'antd/lib/spin'
import Alert from 'antd/lib/alert'
import Tree, { AntTreeNodeEvent } from 'antd/lib/tree'
import withProvider from '../withProvider'
import { Adaptor, DepartmentDesc, TenementDesc } from '../Provider'
import { DefaultExpandedLevel } from '../constants'

export interface DepartmentTreeProps {
  // 当前部门
  tenementId?: string
  tenement?: TenementDesc
  // 可选模式
  selectable?: boolean
  // 已激活部门
  selected?: string
  onSelect?: (value: string, detail?: DepartmentDesc) => void
  // 已选中部门
  value?: DepartmentDesc[]
  onChange?: (value: DepartmentDesc[]) => void
}

interface Props extends Adaptor, DepartmentTreeProps {}

interface State {
  loading?: boolean
  error?: Error
  dataSource?: DepartmentDesc
  dataSourceById?: { [key: string]: DepartmentDesc }
  defaultExpandedKeys?: string[]
}

class DepartmentTree extends React.Component<Props, State> {
  public state: State = {
    loading: false,
  }

  public componentDidMount() {
    this.fetchDepartment()
  }

  public componentDidUpdate(prevProps: Props) {
    // 需要获取更新
    if (this.props.tenementId !== prevProps.tenementId) {
      this.fetchDepartment()
    }
  }

  public render() {
    const { loading, error } = this.state
    return (
      <div className="jm-us-container">
        <Spin spinning={!!loading}>
          {!!error && (
            <Alert
              showIcon
              banner
              type="error"
              message={
                <span>
                  {error.message}, <a onClick={this.fetchDepartment}>重试</a>
                </span>
              }
            />
          )}
          <div className="jm-us-container__body">{this.renderTree()}</div>
        </Spin>
      </div>
    )
  }

  // 获取部门详情
  public getDepartment(id: string) {
    return this.state.dataSourceById && this.state.dataSourceById[id]
  }

  public reset() {}

  private renderTree = () => {
    const { dataSource, defaultExpandedKeys } = this.state

    if (dataSource == null) {
      return null
    }

    const { selectable, value, selected } = this.props
    // TODO: 抽取到state，避免重复渲染
    const checkedKeys = (value || []).map(i => i.id)
    const selectedKeys = selected ? [selected] : undefined

    return (
      <Tree
        checkStrictly
        checkable={selectable}
        checkedKeys={checkedKeys}
        selectedKeys={selectedKeys}
        onCheck={this.handleTreeCheck}
        onSelect={this.handleTreeSelect}
        defaultExpandedKeys={defaultExpandedKeys}
      >
        {this.renderTreeNode(dataSource)}
      </Tree>
    )
  }

  /**
   * 渲染树节点
   */
  private renderTreeNode = (tree: DepartmentDesc) => {
    const userCount = tree.userCount != null ? `(${tree.userCount})` : ''
    return tree.children != null && tree.children.length !== 0 ? (
      <Tree.TreeNode
        title={`${tree.name} ${userCount} `}
        key={tree.id}
        // @ts-ignore
        id={tree.id}
      >
        {tree.children.map(subnode => this.renderTreeNode(subnode))}
      </Tree.TreeNode>
    ) : (
      <Tree.TreeNode
        title={`${tree.name} ${userCount}`}
        key={tree.id}
        // @ts-ignore
        id={tree.id}
      />
    )
  }

  /**
   * 处理树节点选中
   */
  private handleTreeCheck = (
    keys: (string[]) | { checked: string[] },
    evt: AntTreeNodeEvent,
  ) => {
    keys = Array.isArray(keys) ? keys : keys.checked
    const value = this.props.value || []
    const checkedNodes: DepartmentDesc[] = []
    this.getCheckedNodes(
      (evt.checkedNodes || []).map(i => (i.props as { id: string }).id),
      checkedNodes,
    )
    const selectedValue = keys
      .map(id => {
        let index = value.findIndex(i => i.id === id)
        if (index !== -1) {
          return value[index]
        }
        index = checkedNodes.findIndex(i => i.id === id)
        if (index !== -1) {
          return checkedNodes[index]
        }
        return null
      })
      .filter(i => i != null) as DepartmentDesc[]

    if (this.props.onChange) {
      this.props.onChange(selectedValue)
    }
  }

  private getCheckedNodes(keys: string[], results: DepartmentDesc[]) {
    if (this.state.dataSourceById) {
      for (const id of keys) {
        results.push(this.state.dataSourceById[id])
      }
    }
  }

  private handleTreeSelect = (keys: string[]) => {
    const departmentId = keys[0]
    if (this.props.onSelect) {
      const detail =
        this.state.dataSourceById && this.state.dataSourceById[departmentId]
      this.props.onSelect(departmentId, detail)
    }
  }

  /**
   * 获取组织部门树
   */
  private fetchDepartment = async () => {
    const tenementId = this.props.tenementId
    if (tenementId == null) {
      return
    }
    try {
      this.setState({ error: undefined, loading: true })
      const res = await this.props.getDepartmentTree(tenementId)
      // 缓存
      const cached = {}
      const expanedKeys: string[] = []
      this.walkTree(res, cached)
      // 计算默认展开
      this.genExpandedKeys(res, expanedKeys)
      this.setState({
        dataSource: res,
        dataSourceById: cached,
        defaultExpandedKeys: expanedKeys,
      })
    } catch (error) {
      this.setState({ error })
    } finally {
      this.setState({ loading: false })
    }
  }

  private walkTree(
    tree: DepartmentDesc,
    map: { [id: string]: DepartmentDesc },
  ) {
    map[tree.id] = { ...tree, tenement: this.props.tenement }
    if (tree.children && tree.children.length) {
      tree.children.forEach(n => {
        this.walkTree(n, map)
      })
    }
  }

  private genExpandedKeys = (
    tree: DepartmentDesc,
    keys: string[],
    level: number = 1,
  ) => {
    if (tree.open && level < DefaultExpandedLevel) {
      keys.push(tree.id)
    } else {
      return
    }
    if (tree.children != null && tree.children.length !== 0) {
      tree.children.forEach(subnode =>
        this.genExpandedKeys(subnode, keys, level + 1),
      )
    }
  }
}

export default withProvider(DepartmentTree)