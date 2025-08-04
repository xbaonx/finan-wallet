import React from 'react';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../navigation/types';
import TransactionHistoryScreen from './TransactionHistoryScreen';
import TransactionHistoryContainer from '../../core/di/transaction_history_container';

type TransactionHistoryScreenNavigationProp = BottomTabNavigationProp<TabParamList, 'History'>;

interface Props {
  navigation: TransactionHistoryScreenNavigationProp;
}

export const TransactionHistoryScreenWrapper: React.FC<Props> = ({ navigation }) => {
  const container = TransactionHistoryContainer.getInstance();
  const transactionHistoryBloc = container.transactionHistoryBloc;

  return (
    <TransactionHistoryScreen 
      transactionHistoryBloc={transactionHistoryBloc}
    />
  );
};

export default TransactionHistoryScreenWrapper;
