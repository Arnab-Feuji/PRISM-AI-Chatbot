import { useThemeStore } from '../../store/theme';

export function ThemedPatientPage({ default: DefaultPage, material: MaterialPage }) {
  const { isMaterialPatient } = useThemeStore();
  const Page = isMaterialPatient() && MaterialPage ? MaterialPage : DefaultPage;
  return <Page />;
}
