"use client"
import { Header } from '@/components/Header'
import { PeopleTab } from '@/components/PeopleTab'

export default function PeoplePage() {
  return (
    <>
      <Header title="People" />
      <div className="screen" style={{ paddingTop: 16, paddingBottom: 100 }}>
        <PeopleTab />
      </div>
    </>
  )
}
