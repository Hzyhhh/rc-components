import React from 'react'
import { Context } from './Provider'
import { Action, Role, MaybeArray } from './type'

export interface ChooseProps {
  children: React.ReactNode
}

/**
 * 根据权限在子元素中选择可以展示的组件
 * <Choose>
 *   <Choose.Option action={[A, B]}>hello world</Choose.Option>
 *   <Choose.Option action={C}>hello c</Choose.Option>
 *   <Choose.Option role={[RoleA, RoleB]}>hello roles</Choose.Option>
 *   <Choose.Option role={RoleC}>hello role c</Choose.Option>
 *   <div>other</div>
 * </Choose>
 */
export default class Choose extends React.Component<ChooseProps> {
  public static Option = Option
  public render() {
    const { children } = this.props
    return (
      <Context.Consumer>
        {({ allowsSome, is }) => {
          return React.Children.map(children, child => {
            if (
              React.isValidElement<{
                role?: MaybeArray<Role>
                action?: MaybeArray<Action>
              }>(child)
            ) {
              if (child.props.action != null) {
                // 匹配权限
                const actions = child.props.action

                if (actions === '*') {
                  return child
                }

                const normalized: Action[] = Array.isArray(actions)
                  ? actions
                  : [actions]
                if (allowsSome(...normalized)) {
                  return child
                }

                return null
              } else if (child.props.role != null) {
                // 匹配角色
                const role = child.props.role
                const normalized = Array.isArray(role) ? role : [role]
                if (is(...normalized)) {
                  return child
                }

                return null
              }
            }

            return child
          })
        }}
      </Context.Consumer>
    )
  }
}
