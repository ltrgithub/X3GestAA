using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.IO;

namespace StreamsApp
{
    class TestStream: Stream
    {
        private Stream wrappedStream;

        public TestStream(Stream s)
        {
            wrappedStream = s;
        }

        public override bool CanRead
        {
            get
            {
                return wrappedStream.CanRead;
            }
        }

        public override bool CanSeek
        {
            get
            {
                return wrappedStream.CanSeek;
            }
        }

        public override bool CanWrite
        {
            get
            {
                return wrappedStream.CanWrite;
            }
        }

        public override long Length
        {
            get
            {
                return wrappedStream.Length;
            }
        }

        public override long Position
        {
            get
            {
                return wrappedStream.Position;
            }

            set
            {
                wrappedStream.Position = value;
            }
        }

        public override void Flush()
        {
            wrappedStream.Flush();
        }

        public override int Read(byte[] buffer, int offset, int count)
        {
            return wrappedStream.Read(buffer, offset, count);
        }

        public override long Seek(long offset, SeekOrigin origin)
        {
            return wrappedStream.Seek(offset, origin);
        }

        public override void SetLength(long value)
        {
            wrappedStream.SetLength(value);
        }

        public override void Write(byte[] buffer, int offset, int count)
        {
            wrappedStream.Write(buffer, offset, count);
        }

        public async Task<byte[]> ReadPaketAsync()
        {
            byte[] buffer = new byte[32];
            byte[] buffer2 = new byte[256];

            int pos = 0;
            while (true)
            {
                int num = await this.ReadAsync(buffer, 0, buffer.Length);
                Console.WriteLine(num);
                if (num <= 0)
                {
                    break;
                }
                Array.Copy(buffer, 0, buffer2, pos, num);
                pos += num;
                if (pos > 128)
                {
                    break;
                }
            }

            byte[] r = new byte[pos];
            Array.Copy(buffer2, r, pos);
            return r;
        }
    }

    class Program
    {

        static void Main(string[] args)
        {

            new Program().Go();
            Console.ReadLine();
        }

        byte[] buffer = new byte[128];

        public async void Go()
        {
            MemoryStream ms = new MemoryStream();
            TestStream wt = new TestStream(ms);
            Stream fs = new StreamReader(@"C:\temp\test.txt").BaseStream;
            TestStream rd = new TestStream(fs);

            int num = 1;
            while (num > 0)
            {
                //num = await rd.ReadAsync(buffer, 0, buffer.Length);
                //await wt.WriteAsync(buffer, 0, num);

                byte[] c = await rd.ReadPaketAsync();
                num = c.Length;
                await wt.WriteAsync(c, 0, c.Length);

                //Console.Write(Encoding.UTF8.GetString(buffer, 0, buffer.Length));
            }

            byte[] res = ms.GetBuffer();
            Console.WriteLine(Encoding.UTF8.GetString(res, 0, (int) ms.Length));
            Console.WriteLine("Size: " + ms.Length);
        }
    }
}
