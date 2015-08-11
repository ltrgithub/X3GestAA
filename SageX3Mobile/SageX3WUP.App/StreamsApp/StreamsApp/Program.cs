using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.IO;

namespace StreamsApp
{
    public class Program
    {
        static void Main(string[] args)
        {
            Go();
        }
        public static void Go()
        {
            GoAsync();
            Console.ReadLine();
        }
        public static async void GoAsync()
        {

            Console.WriteLine("Starting");


            int i = 10;
            Task task1 = null;
            Task task2 = null;
                try {
            while (i-->0)
            {
                    if (task1 == null || task1.IsCompleted)
                    {
                        if (task1 != null && task1.Exception != null)
                        {
                            throw task1.Exception;
                        }
                        task1 = Sleep(1000, i).ContinueWith(ix=>Sleep(1500, 0));
                    }
                    if (task2 == null || task2.IsCompleted)
                    {
                        if (task2 != null && task2.Exception != null)
                        {
                            throw task2.Exception;
                        }
                        task2 = Sleep(2000, i);
                    }
                    Task<int>.WaitAny(task1, task2);
            }
                } catch (Exception e)
                {
                    Console.WriteLine(e.Message);
                }

        }

        private async static Task<int> Sleep(int ms, int i)
        {
            Console.WriteLine("Sleeping for {0} at {1}", ms, Environment.TickCount);
            await Task.Delay(ms);
            if (i == 2)
            {
                Console.WriteLine("Throw");
                throw new Exception("Killed");
            }
            Console.WriteLine("Sleeping for {0} finished at {1}", ms, Environment.TickCount);
            return ms;
        }
    }
}
