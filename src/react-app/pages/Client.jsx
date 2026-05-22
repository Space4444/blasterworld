import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from 'antd';
import { GoogleCircleFilled, GithubOutlined } from '@ant-design/icons';
import { useSession, signUp, signIn } from '../auth-client'; 
import toast from 'react-hot-toast';
import Toaster from '../components/Toaster';


export default function Client() {
    const [username, setUsername] = useState('');
    const navigate = useNavigate();
    const { data: session } = useSession();
    
    useEffect(() => {
        if (session) {
            navigate('/profile_');
        }
    }, [session]);

    useEffect(() => window.seed && location.reload(), [window.seed]);
    
    async function playAsGuest(e) {
        e.preventDefault();
        navigate('/guest_', { state: { username } });
    }

    async function socialLogin(provider, e) {
        e.preventDefault();

        return signIn.social({
            provider
        }, {
            onSuccess: () => {
                toast.loading('Signing in...');
            },
            onError: (ctx) => {
                toast.error(ctx.error.message);
            },
        });
    }

    return (<>
        <Toaster />

        <div id="controls" className="z-50 absolute">
        <p>⬤ To fly forward press either <b>W</b>, <b>up arrow</b>, or <b>left mouse button</b></p>
        <p>⬤ You can also fly backwards by pressing either <b>S</b>, <b>down arrow</b>, or <b>right mouse button</b></p>
        <p>⬤ To shoot press either <b>SPACEBAR</b>, or <b>middle mouse button</b></p>
        </div>

        <div className="container w-1/2 h-1/2 min-h-60 min-w-60 z-0 relative">

            <div className="h-1/6 flex items-center justify-center">
                <h1 className="text-3xl leading-loose">Galactic Battles</h1>
            </div>

            <div className="h-1/3 flex items-center justify-center">
                <form onSubmit={playAsGuest}>
                    <div>
                        <input
                            className="border-2 border-blue-500 text-white"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            type='text'
                            placeholder='Nick'
                        />
                    </div>

                    <Button type="primary" className="m-1" htmlType="submit">Play as guest</Button>
                </form>
            </div>

            <hr/>

            <div className="h-1/2 flex items-center justify-center">
            
                <div>
                    <Link to="/login_"><Button type="primary" className="m-1">Log in</Button></Link>
                    <Link to="/signup_"><Button type="primary" className="m-1">Sign up</Button></Link>
                    <br/>
                    <Button
                        icon={<GoogleCircleFilled />}
                        onClick={e => socialLogin('google', e)}
                    >
                        Sign in with Google
                    </Button>
                    <br/>
                    <Button
                        icon={<GithubOutlined />}
                        onClick={e => socialLogin('github', e)}
                    >
                        Sign in with Github
                    </Button>
                </div>

            </div>

        </div>
    </>);
}