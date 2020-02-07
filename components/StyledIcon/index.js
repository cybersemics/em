import { MaterialIcons, Octicons, Ionicons, AntDesign, Feather, EvilIcons } from '@expo/vector-icons'
import React, { Component } from 'react';
import styles from './styles'

export const Dot = () => {
  return (<Octicons
    name='primitive-dot'
    size={20}
    style={styles.listItemIcon}
    color='white'
  />)
}

export const Show = () => {
  return (<Ionicons
    name='md-arrow-dropdown'
    size={20}
    style={styles.listItemIcon}
    color='white'
  />)
}

export const Hide = () => {
  return (<Ionicons
    name='md-arrow-dropright'
    size={20}
    style={styles.listItemIcon}
    color='white'
  />)
}

export const Add = () => {
  return (
    <MaterialIcons
      name='add'
      size={20}
      style={styles.listItemIcon}
      color='white'
    />)
}

export const Menu = () => {
  return (
    <MaterialIcons
      name='menu'
      size={25}
      style={styles.listItemIcon}
      color='white'
    />
  )
}

export const Delete = () => {
  return (
    <AntDesign
      name='delete'
      size={20}
      style={styles.listItemIcon}
      color='white'
    />)
}

export const Search = () => {
  return (
    <MaterialIcons
      name='search'
      size={20}
      style={styles.listItemIcon}
      color='white'
    />)
}

export const MenuFold = () => {
  return (
    <AntDesign
      name='menu-fold'
      size={20}
      style={styles.listItemIcon}
      color='white'
    />)
}

export const MenuUnFold = () => {
  return (
    <AntDesign
      name='menu-unfold'
      size={20}
      style={styles.listItemIcon}
      color='white'
    />)
}

export const Undo = () => {
  return (
    <EvilIcons
      name='undo'
      size={20}
      style={styles.listItemIcon}
      color='white'
    />)
}

export const Redo = () => {
  return (
    <EvilIcons
      name='redo'
      size={20}
      style={styles.listItemIcon}
      color='white'
    />)
}