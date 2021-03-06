/**
 * Provider
 * 1. 用于提供全局的缓存store，避免重复请求
 * 2. 提供api接口适配器配置
 */
import React from 'react'

/**
 * 企业
 */
export interface TenementDesc {
  id: string
  name: string
  // 扩展字段，自定义，用户选择器不会关心这里面的内容
  extra?: any
}

/**
 *  部门树
 */
export interface DepartmentDesc {
  id: string
  // 部门名称
  name: string
  // 用户数(不包括下级部门)
  userCount?: string
  // 默认是否展开
  open?: boolean
  // 子部门
  children?: DepartmentDesc[]
  // 关联的企业，不是所有情况都存在，主要用于格式化/展示
  tenement?: TenementDesc
  // 扩展字段，自定义，用户选择器不会关心这里面的内容
  extra?: any
  // 父部门的完整路径，在异步模式下有用
  parentIds?: string[]
  // 完整路径, 如果存在，在已选中栏的tooltip会显示该数据
  fullPath?: string
}

/**
 * 搜索结构表示
 */
export interface DepartmentSearchResult extends DepartmentDesc {
  leaf: boolean
  parentId: string
  // 完整路径
  parentIds: string[]
}

/**
 * 成员
 */
export interface UserDesc {
  id: string
  name: string
  // 手机号码
  mobile: string
  // 扩展字段，自定义，用户选择器不会关心这里面的内容
  extra?: any
  // 关联的企业或部门
  tenement?: TenementDesc
  department?: DepartmentDesc
}

/**
 * 用户选择器适配器
 */
export interface Adaptor {
  /**
   * 获取部门树
   */
  getDepartmentTree(tenementId: string, extra?: any): Promise<DepartmentDesc>
  /**
   * 获取指定部门的子节点，用于惰性加载子节点, 如果提供该方法将会启用异步模式
   * 可选
   */
  getDepartmentChildren?: (
    tenementId: string,
    departmentId: string,
    extra?: any,
  ) => Promise<DepartmentDesc[] | undefined>
  /**
   * 获取部门成员
   */
  getDepartmentUsers(
    tenementId: string,
    departmentId: string,
    page: number,
    pageSize: number,
    extra?: any,
  ): Promise<{ items: UserDesc[]; total: number }>
  /**
   * 用户搜索
   * tenementId不为空时，表示企业内搜索
   */
  searchUser(
    query: string,
    page: number,
    pageSize: number,
    tenementId?: string,
    extra?: any,
  ): Promise<{ items: UserDesc[]; total: number }>
  /**
   * 企业搜索
   */
  searchTenement(
    query: string,
    page: number,
    pageSize: number,
    extra?: any,
  ): Promise<{ items: TenementDesc[]; total: number }>
  /**
   * 部门搜索, 异步模式下会使用这种方式进行搜索
   */
  searchDepartment?: (
    query: string,
    page: number,
    pageSize: number,
    tenementId?: string,
    extra?: any,
  ) => Promise<{ items: DepartmentSearchResult[]; total: number }>
  /**
   * 节点合并， 用于配合部门搜索，将选择和取消选择的节点进行合并
   *  用于异步模式
   */
  normalizeDepartmentChecked?: (
    currentSelected: DepartmentDesc[],
    added: DepartmentDesc[],
    removed: DepartmentDesc[],
    tenementId?: string,
    extra?: any,
  ) => Promise<DepartmentSearchResult[]>

  /**
   * 获取部门信息详情，包含完整路径等信息, 用于异步模式
   */
  getDepartmentDetail?: (
    ids: string[],
    tenementId?: string,
    extra?: any,
  ) => Promise<DepartmentSearchResult[]>

  /**
   * 用户显示格式化器，适用于UserSearch和UserSearchComboBox
   */
  userFormatter?: (t: UserDesc, extra?: any) => string
}

export interface UserSelectContext extends Adaptor {
  resetCache: () => void
}

export interface ProviderProps {
  adaptor: Adaptor
  // 是否启用缓存
  cacheable?: boolean
}

interface State {
  // 以tenementId为键进行缓存
  departmentTrees: Map<string, DepartmentDesc>
  // 以tenementId-departmentsId为键进行缓存
  departmentUsers: Map<
    string,
    { list: { [page: string]: UserDesc[] }; total: number }
  >
  usersCached: Map<string, { items: UserDesc[]; total: number }>
  tenementsCached: Map<string, { items: TenementDesc[]; total: number }>
}

export const Context = React.createContext<UserSelectContext>(
  {} as UserSelectContext,
)

/**
 * UserSelect Provider
 */
export default class Provider extends React.Component<ProviderProps> {
  // 缓存
  public store: State = {
    departmentTrees: new Map(),
    departmentUsers: new Map(),
    usersCached: new Map(),
    tenementsCached: new Map(),
  }
  private contextValue: UserSelectContext

  public componentWillMount() {
    const { cacheable = true } = this.props
    this.contextValue = {
      getDepartmentTree: cacheable
        ? this.getDepartmentTree
        : this.props.adaptor.getDepartmentTree,
      getDepartmentUsers: cacheable
        ? this.getDepartmentUsers
        : this.props.adaptor.getDepartmentUsers,
      searchUser: cacheable ? this.searchUser : this.props.adaptor.searchUser,
      searchTenement: cacheable
        ? this.searchTenement
        : this.props.adaptor.searchTenement,
      getDepartmentChildren: this.props.adaptor.getDepartmentChildren,
      searchDepartment: this.props.adaptor.searchDepartment,
      normalizeDepartmentChecked: this.props.adaptor.normalizeDepartmentChecked,
      getDepartmentDetail: this.props.adaptor.getDepartmentDetail,
      userFormatter: this.props.adaptor.userFormatter,
      resetCache: () => {
        this.store = {
          departmentTrees: new Map(),
          departmentUsers: new Map(),
          usersCached: new Map(),
          tenementsCached: new Map(),
        }
      },
    }
  }

  public render() {
    return (
      <Context.Provider value={this.contextValue}>
        {this.props.children}
      </Context.Provider>
    )
  }

  private getDepartmentTree = async (
    tenement: string,
    extra?: any,
  ): Promise<DepartmentDesc> => {
    const key = `${tenement}-${this.serialExtra(extra)}`
    if (this.store.departmentTrees.has(key)) {
      return this.store.departmentTrees.get(key) as DepartmentDesc
    }
    const tree = await this.props.adaptor.getDepartmentTree(tenement, extra)
    this.store.departmentTrees.set(key, tree)
    return tree
  }

  private getDepartmentUsers = async (
    tenementId: string,
    departmentId: string,
    page: number,
    pageSize: number,
    extra?: any,
  ): Promise<{ items: UserDesc[]; total: number }> => {
    const key = `${tenementId}-${departmentId}-${this.serialExtra(extra)}`
    const users = this.store.departmentUsers.get(key)
    if (users && users.list && users.list[page] != null) {
      return { items: users.list[page], total: users.total }
    }
    const res = await this.props.adaptor.getDepartmentUsers(
      tenementId,
      departmentId,
      page,
      pageSize,
      extra,
    )
    this.store.departmentUsers.set(key, {
      list: { ...((users && users.list) || {}), [page]: res.items },
      total: res.total,
    })

    return res
  }

  private searchUser = async (
    query: string,
    page: number,
    pageSize: number,
    tenement?: string,
    extra?: any,
  ): Promise<{ items: UserDesc[]; total: number }> => {
    const key = `${query}-${page}-${pageSize}-${tenement ||
      ''}-${this.serialExtra(extra)}`
    const cached = this.store.usersCached.get(key)
    if (cached) {
      return cached
    }
    const res = await this.props.adaptor.searchUser(
      query,
      page,
      pageSize,
      tenement,
      extra,
    )
    this.store.usersCached.set(key, res)
    return res
  }

  private searchTenement = async (
    query: string,
    page: number,
    pageSize: number,
    extra?: any,
  ): Promise<{ items: TenementDesc[]; total: number }> => {
    const key = `${query}-${page}-${pageSize}-${this.serialExtra(extra)}`
    const cached = this.store.tenementsCached.get(key)
    if (cached) {
      return cached
    }
    const res = await this.props.adaptor.searchTenement(
      query,
      page,
      pageSize,
      extra,
    )
    this.store.tenementsCached.set(key, res)
    return res
  }

  private serialExtra(extra: any) {
    if (extra == null) {
      return ''
    }
    try {
      return JSON.stringify(extra)
    } catch (err) {
      return ''
    }
  }
}
