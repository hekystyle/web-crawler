import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Button, Card, ConfigProvider, Form, FormProps, Input, Layout, Space, Table, theme } from 'antd';
import { Netmask } from 'netmask';
import { FC, Suspense, useState } from 'react';
import { RecoilRoot } from 'recoil';
import { QUERY_CLIENT } from 'services/queryClient';

const testIp = async ({ ip, signal }: { ip: string; signal: AbortSignal | undefined }): Promise<boolean> => {
  try {
    const response = await fetch(`http://${ip}`, { signal, method: 'HEAD' });
    return !!(response.ok && response.headers.get('content-type')?.includes('text/html'));
  } catch (e) {
    console.log('🚀 ~ file: App.tsx:16 ~ testIp ~ e:', e);
    return false;
  }
};

interface FormValues {
  network: string;
}

const AddressTest = ({ ip }: { ip: string }) => {
  const { data } = useQuery({
    queryKey: ['ip', ip],
    queryFn: async ({ signal }) => await testIp({ ip, signal }),
    suspense: true,
    useErrorBoundary: false,
  });

  if (data === undefined) return <>Loading...</>;
  return data ? <CheckOutlined /> : <CloseOutlined />;
};

const Crawler = () => {
  const [addresses, setAddresses] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const handleFormFinish: FormProps<FormValues>['onFinish'] = values => {
    console.log('form finished', values);
    const newAddresses: string[] = [];
    new Netmask(values.network).forEach(ip => {
      newAddresses.push(ip);
    });
    queryClient.invalidateQueries('ip').catch(console.error);
    setAddresses(newAddresses);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form<FormValues>
        initialValues={{
          network: '192.168.3.0/24',
        }}
        layout="vertical"
        onFinish={handleFormFinish}
      >
        <Form.Item
          required
          label="Network base"
          name="network"
          rules={[
            {
              required: true,
            },
            {
              validator: async (_, value) => {
                if (typeof value !== 'string') return;
                // eslint-disable-next-line no-new
                new Netmask(value);
              },
            },
          ]}
        >
          <Input placeholder="192.168.3.0" />
        </Form.Item>
        <Button block htmlType="submit" type="primary">
          Scan
        </Button>
      </Form>
      <Table
        columns={[
          {
            title: 'Address',
            key: 'ip',
            render: (_, { ip }) => ip,
          },
          {
            title: 'Status',
            key: 'status',
            render: (_, { ip }) => (
              <Suspense fallback="Loading...">
                <AddressTest ip={ip} />
              </Suspense>
            ),
          },
        ]}
        dataSource={addresses.map(ip => ({ ip }))}
        pagination={false}
        rowKey={row => row.ip}
      />
    </Space>
  );
};

export const App: FC = () => (
  <ConfigProvider theme={{ algorithm: [theme.darkAlgorithm] }}>
    <RecoilRoot>
      <QueryClientProvider client={QUERY_CLIENT}>
        <Layout>
          <Layout.Content>
            <Card>
              <Crawler />
            </Card>
          </Layout.Content>
        </Layout>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </RecoilRoot>
  </ConfigProvider>
);
